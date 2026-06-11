import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { patchStorefrontHtml } from '../src/proxy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BASE = 'http://127.0.0.1:3004';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const sampleHtml = `<html><head></head><body>
<link href="//shop-titancore.com/cdn/shop/t/12/assets/theme.css?v=1" rel="stylesheet" />
<script src="/cdn/shopifycloud/shop-js/loader.js"></script>
<script>Shopify.cdnHost = "shop-titancore.com/cdn";</script>
<link href="/cdn/shop/t/12/assets/theme.css?v=1" rel="stylesheet" /><script>
(function(){
  var match = window.location.search.match(/[?&]vclid=([^&]+)/);
  if(match && match[1]){
    document.cookie = 'vclid=' + match[1] + ';path=/;max-age=86400;SameSite=Lax';
  }
</script>
</body></html>`;

const patched = patchStorefrontHtml(sampleHtml);
assert(/https:\/\/shop-titancore\.com\/cdn\/shop\/t\/12\/assets\/theme\.css/i.test(patched), 'theme.css should point to shop-titancore.com CDN');
assert(/https:\/\/shop-titancore\.com\/cdn\/shopifycloud\/shop-js\/loader\.js/i.test(patched), 'shopifycloud scripts should point to origin CDN');
assert(patched.includes('Shopify.cdnHost = location.host + "/cdn"'), 'Shopify.cdnHost should use location.host');
assert(/SameSite=Lax';\s*\}\s*\}\)\(\);<\/script>/.test(patched), 'vclid script should be closed with })();');

const serverProc = spawn(process.execPath, ['src/index.js'], {
  cwd: ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, PORT: '3004', TARGET_URL: 'https://shop-titancore.com' },
});

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(BASE);
      if (r.status < 500) return;
    } catch {}
    await sleep(500);
  }
  throw new Error('server not ready');
}

try {
  await waitForServer();
  const html = await fetch(`${BASE}/products/hybrid-pots-pans-set-12-pc`).then((r) => r.text());
  assert(/https:\/\/shop-titancore\.com\/cdn\/shop\/[^"']+theme\.css/i.test(html), 'live HTML theme.css should bypass mirror domain');
  assert(html.includes('Shopify.cdnHost = location.host + "/cdn"'), 'live HTML should patch Shopify.cdnHost');
  assert(html.includes('<base href="/">'), 'HTML should inject base tag');
  assert(html.includes('isShopifyCheckoutUrl'), 'HTML should include checkout guard');

  const settings = await fetch(`${BASE}/api/settings`);
  assert(settings.ok, '/api/settings should return 200 from node');
  const settingsJson = await settings.json();
  assert(settingsJson.data && Array.isArray(settingsJson.data.fbPixels), '/api/settings should return fbPixels array');

  const inject = fs.readFileSync(path.join(ROOT, 'src', 'inject.js'), 'utf8');
  assert(inject.includes('redirectToCheckout'), 'inject should define redirectToCheckout');
  assert(inject.includes('TITANCORE_HOST_RE'), 'inject should target shop-titancore.com');

  console.log('test:proxy-rewrite OK');
} finally {
  serverProc.kill();
  await sleep(300);
}

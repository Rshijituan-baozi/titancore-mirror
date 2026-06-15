import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { patchStorefrontHtml, patchAdvertorialHtml, isWwwOnlyPath, resolveUpstream } from '../src/proxy.js';

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
assert(isWwwOnlyPath('/tpmn/lan'), '/tpmn/lan should use www upstream');
assert(isWwwOnlyPath('/core.min.js'), 'core.min.js should use www upstream');
assert(isWwwOnlyPath('/core.min.css'), 'core.min.css should use www upstream');
assert(!isWwwOnlyPath('/products/hybrid-pots-pans-set-12-pc'), 'product pages should use primary upstream');
assert(resolveUpstream('/tpmn/lan') === 'https://www.shop-titancore.com', 'tpmn should resolve to www target');
assert(resolveUpstream('/core.min.css') === 'https://www.shop-titancore.com', 'core.min.css should resolve to www target');
assert(resolveUpstream('/cart') === 'https://shop-titancore.com', 'cart should resolve to primary target');

const lanSample = '<a target=_self href=https://get-titancore.com/products/native><picture><source srcset=//img.funnelish.com/19810/0/1768059682-s%20%2854%29.png media="(width > 1024px)"><img src=//img.funnelish.com/19810/0/1768059682-s%20%2854%29.png></picture></a><a class=btn href=https://get-titancore.com/products/native><span>GET UP TO 70% OFF >></span></a><a href=https://get-titancore.com/product>CTA</a>';
const lanPatched = patchAdvertorialHtml(lanSample);
assert(lanPatched.includes('href=/products/native'), 'lan CTAs should point to mirror product path');
assert(!lanPatched.includes('get-titancore.com'), 'lan should not keep get-titancore links');
assert(lanPatched.includes('cdn/shop/files/333.png'), 'lan hero image should use TitanCore CDN');
assert(!lanPatched.includes('funnelish.com/19810/0/1768059682'), 'lan hero should drop funnelish image');

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

  const tpmnRes = await fetch(`${BASE}/tpmn/lan`);
  assert(tpmnRes.ok, '/tpmn/lan should proxy via www upstream (not 404)');
  const tpmnHtml = await tpmnRes.text();
  assert(
    /Shocking Reasons|Advertorial|PFAS Awareness Sale/i.test(tpmnHtml),
    '/tpmn/lan should return advertorial landing page',
  );

  const coreCss = await fetch(`${BASE}/core.min.css`);
  assert(coreCss.ok, '/core.min.css should proxy via www upstream');
  assert(String(coreCss.headers.get('content-type') || '').includes('css'), 'core.min.css content-type');

  const coreJs = await fetch(`${BASE}/core.min.js`);
  assert(coreJs.ok, '/core.min.js should proxy via www upstream');

  const tpmnLive = await fetch(`${BASE}/tpmn/lan`).then((r) => r.text());
  assert(tpmnLive.includes('/products/native'), 'live /tpmn/lan should rewrite product links');
  assert(tpmnLive.includes('cdn/shop/files/333.png'), 'live /tpmn/lan should use configured hero image');
  assert(!tpmnLive.includes('get-titancore.com/products/native'), 'live /tpmn/lan should not expose get-titancore product URL');

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

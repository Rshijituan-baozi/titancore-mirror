import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  patchHybridProductHtml,
  patchAdvertorialHtml,
  patchAdvertorialDiscount,
  formatMoneyLikeTemplate,
} from '../src/proxy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(formatMoneyLikeTemplate(59, 'RM3,913.00 MYR') === 'RM59.00 MYR', 'MYR sale format');
assert(formatMoneyLikeTemplate(599, 'RM5,360.00 MYR') === 'RM599.00 MYR', 'MYR compare format');
assert(formatMoneyLikeTemplate(59, '¥6,514.00') === '¥59.00', 'JPY sale format');
assert(formatMoneyLikeTemplate(599, '£1,000.00') === '£599.00', 'GBP compare format');

const hybridSample = `
<price-list><sale-price class="text-lg text-on-sale">
<span class="sr-only">Sale price</span>RM3,913.00 MYR</sale-price>
<compare-at-price class="text-subdued line-through">
<span class="sr-only">Regular price</span>RM5,360.00 MYR</compare-at-price></price-list>
<button>Claim Offer - <span class="atc-price">RM3,913</span></button>
"price":391300, "compareAtPrice": 536000
"subtitle":"Save 40%"
Others Also Bought
<product-card><sale-price><span class="sr-only">Sale price</span>RM109.00</sale-price></product-card>`;

const hybridPatched = patchHybridProductHtml(hybridSample);
assert(hybridPatched.includes('RM59.00 MYR'), 'main sale price');
assert(hybridPatched.includes('RM599.00 MYR'), 'main compare price');
assert(hybridPatched.includes('atc-price">RM59'), 'atc price');
assert(hybridPatched.includes('"price":5900'), 'json sale cents');
assert(hybridPatched.includes('"compareAtPrice":59900'), 'json compare cents');
assert(hybridPatched.includes('Save 90%'), 'save badge');
assert(hybridPatched.includes('RM109.00'), 'related product price untouched');

const lanSample = 'UP TO 70% OFF FOR A LIMITED TIME! GET UP TO 70% OFF >> 50 to 70% of nutrients';
const lanDisc = patchAdvertorialDiscount(lanSample);
assert(lanDisc.includes('UP TO 90% OFF'), 'lan banner');
assert(lanDisc.includes('GET UP TO 90% OFF'), 'lan cta');
assert(lanDisc.includes('50 to 70% of nutrients'), 'nutrient stat untouched');

const serverProc = spawn(process.execPath, ['src/index.js'], {
  cwd: ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, PORT: '3007', TARGET_URL: 'https://shop-titancore.com' },
});

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch('http://127.0.0.1:3007/');
      if (r.status < 500) return;
    } catch {}
    await sleep(500);
  }
  throw new Error('server not ready');
}

try {
  await waitForServer();
  const productHtml = await fetch('http://127.0.0.1:3007/products/hybrid-pots-pans-set-12-pc').then((r) => r.text());
  const mainChunk = productHtml.split('Others Also Bought')[0] || productHtml;
  assert(/sale-price[\s\S]{0,120}59\.00/i.test(mainChunk), 'live main sale ~59');
  assert(/compare-at-price[\s\S]{0,120}599\.00/i.test(mainChunk), 'live main compare ~599');
  assert(!/6514\.00|3913\.00|5360\.00|8922\.00/.test(mainChunk), 'live main should drop upstream amounts');

  const lanHtml = await fetch('http://127.0.0.1:3007/tpmn/lan').then((r) => r.text());
  assert(/UP TO 90% OFF/i.test(lanHtml), 'live lan 90% off');
  assert(!/UP TO 70% OFF/i.test(lanHtml), 'live lan no 70% off');
  assert(/50 to 70%|50-70%/i.test(lanHtml) || !/70% OFF/i.test(lanHtml), 'lan keeps non-discount 70% or no 70% off');

  console.log('test:price-patch OK');
} finally {
  serverProc.kill();
  await sleep(300);
}

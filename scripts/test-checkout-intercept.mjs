import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BASE = 'http://127.0.0.1:3004';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

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

  const checkout302 = await fetch(`${BASE}/checkout`, { redirect: 'manual' });
  assert(checkout302.status === 302, 'GET /checkout should 302');
  assert(checkout302.headers.get('location') === '/checkout/', 'GET /checkout should redirect to /checkout/');

  const checkouts302 = await fetch(`${BASE}/checkouts/cn/test`, { redirect: 'manual' });
  assert(checkouts302.status === 302, 'GET /checkouts/* should 302');
  assert(checkouts302.headers.get('location') === '/checkout/', 'GET /checkouts/* should redirect to /checkout/');

  const checkoutPage = await fetch(`${BASE}/checkout/`);
  assert(checkoutPage.ok, 'GET /checkout/ should 200');
  const checkoutHtml = await checkoutPage.text();
  assert(checkoutHtml.includes('TitanCore'), 'checkout page should be TitanCore branded');
  assert(checkoutHtml.includes('Secure Checkout') || checkoutHtml.includes('Email'), 'checkout page should have checkout form sections');
  assert(!checkoutHtml.includes('aria-label="Quick Checkout"'), 'checkout page should not show Quick Checkout section');

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }),
      page.evaluate(() => { location.assign('/checkout'); }),
    ]);
    assert(page.url().includes('/checkout'), `location.assign /checkout should navigate to checkout, got ${page.url()}`);
    console.log('PASS: client navigation /checkout intercepted');

    await page.goto(`${BASE}/cart`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }),
      page.evaluate(() => {
        var form = document.createElement('form');
        form.action = '/cart';
        form.method = 'post';
        var btn = document.createElement('button');
        btn.name = 'checkout';
        btn.type = 'submit';
        form.appendChild(btn);
        document.body.appendChild(form);
        btn.click();
      }),
    ]);
    assert(page.url().includes('/checkout'), `cart checkout submit should navigate to checkout, got ${page.url()}`);
    console.log('PASS: cart checkout form intercepted');
  } finally {
    await browser.close();
  }

  console.log('test:checkout-intercept OK');
} finally {
  serverProc.kill();
  await sleep(300);
}

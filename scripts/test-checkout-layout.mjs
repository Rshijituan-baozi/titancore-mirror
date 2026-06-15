import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BASE = 'http://127.0.0.1:3005';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const serverProc = spawn(process.execPath, ['src/index.js'], {
  cwd: ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, PORT: '3005', TARGET_URL: 'https://shop-titancore.com' },
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
  const htmlPath = path.join(ROOT, 'public', 'checkout', 'index.html');
  assert(fs.existsSync(htmlPath), 'public/checkout/index.html must exist — run npm run build:checkout');
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert(html.includes('g9gqqf1'), 'checkout HTML should retain Shopify layout wrapper g9gqqf1');
  assert(!html.includes('aria-label="Quick Checkout"'), 'checkout HTML should not contain Quick Checkout section');
  assert(!html.includes('Save my information for a faster checkout'), 'checkout HTML should not contain Shop save checkbox');
  assert(!html.includes('>Accept Offer<'), 'checkout HTML should not contain Accept Offer button');
  assert(!html.includes('<aside data-inspector-id="orderSummary"'), 'checkout HTML should not contain mobile orderSummary aside');
  assert(html.includes('Step 3'), 'checkout HTML should contain Step 3 payment section');
  assert(html.includes('Secure Checkout'), 'checkout HTML should contain Secure Checkout');
  assert(html.includes('id="bill-email"'), 'checkout HTML should contain bill-email field');
  assert(html.includes('id="summary-items"'), 'checkout HTML should contain #summary-items');
  assert(html.includes('id="pay-btn"'), 'checkout HTML should contain #pay-btn');
  assert(html.includes('checkout-fix.css'), 'checkout HTML should link checkout-fix.css');

  assert(html.includes('id="pay-btn"'), 'checkout HTML should contain #pay-btn');
  assert(html.includes('checkout-fix.css'), 'checkout HTML should link checkout-fix.css');
  assert(!html.includes('id="checkout-status"'), 'checkout HTML should not contain #checkout-status');
  assert((html.match(/id="card-number-error"/g) || []).length === 1, 'checkout HTML should have exactly one #card-number-error');

  await waitForServer();

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

  async function checkLayout(page, label) {
    const layout = await page.evaluate(() => {
      const payBtn = document.getElementById('pay-btn');
      const summaryItems = document.getElementById('summary-items');
      const payBtns = [...document.querySelectorAll('button')].filter((b) => /pay now/i.test(b.textContent));
      const sidebar = document.querySelector('div[data-inspector-id="orderSummary"] aside, aside:last-of-type');
      const mobileSummary = document.querySelector('aside[data-inspector-id="orderSummary"]');
      const shopSave = [...document.querySelectorAll('label, p, span')].some((el) =>
        el.textContent.includes('Save my information') || el.textContent.includes('create a Shop account'),
      );
      const acceptOffer = [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Accept Offer');
      const g9 = document.querySelector('.g9gqqf1');
      const payInSidebar = sidebar && sidebar.querySelector('#pay-btn');
      const summaryInSidebar = sidebar && sidebar.contains(summaryItems);
      const topPayVisible = payBtns.some((b) => {
        const r = b.getBoundingClientRect();
        return r.top < 120 && r.width > 0 && getComputedStyle(b).display !== 'none';
      });
      const payRect = payBtn ? payBtn.getBoundingClientRect() : null;
      const summaryRect = summaryItems ? summaryItems.getBoundingClientRect() : null;
      const orderSummaryCol = document.querySelector('div[data-inspector-id="orderSummary"]');
      const orderSummaryVisible = orderSummaryCol
        ? getComputedStyle(orderSummaryCol).display !== 'none' && orderSummaryCol.getBoundingClientRect().height > 0
        : false;
      return {
        payBtnCount: payBtns.length,
        hasG9: !!g9,
        hasMobileSummary: !!mobileSummary,
        shopSave,
        acceptOffer,
        summaryInSidebar,
        payInSidebar: !!payInSidebar,
        topPayVisible,
        subtotalId: !!document.getElementById('subtotal-price'),
        totalId: !!document.getElementById('total-price'),
        payVisible: !!(payRect && payRect.width > 0 && payRect.height > 0 && getComputedStyle(payBtn).display !== 'none'),
        summaryVisible: !!(summaryRect && summaryRect.width > 0 && summaryRect.height > 0),
        orderSummaryVisible,
        cardErrorCount: document.querySelectorAll('#card-number-error').length,
        checkoutStatusAbsent: !document.getElementById('checkout-status'),
      };
    });

    assert(layout.hasG9, `${label}: page should have .g9gqqf1 layout wrapper`);
    assert(layout.payBtnCount === 1, `${label}: expected exactly 1 Pay now button, got ${layout.payBtnCount}`);
    assert(!layout.hasMobileSummary, `${label}: mobile orderSummary aside should be absent`);
    assert(!layout.shopSave, `${label}: Shop save / account text should be absent`);
    assert(!layout.acceptOffer, `${label}: Accept Offer button should be absent`);
    assert(layout.summaryInSidebar, `${label}: #summary-items should be inside sidebar`);
    assert(layout.payInSidebar, `${label}: #pay-btn should be inside sidebar`);
    assert(!layout.topPayVisible, `${label}: Pay now should not appear at top of page`);
    assert(layout.subtotalId && layout.totalId, `${label}: subtotal-price and total-price ids should exist`);
    assert(layout.cardErrorCount === 1, `${label}: should have exactly one #card-number-error`);
    assert(layout.checkoutStatusAbsent, `${label}: #checkout-status should be absent`);
    return layout;
  }

  try {
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1280, height: 900 });
    await desktopPage.goto(`${BASE}/checkout/`, { waitUntil: 'networkidle0', timeout: 45000 });
    await checkLayout(desktopPage, 'desktop');
    console.log('PASS: checkout layout structure (desktop)');

    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844 });
    await mobilePage.goto(`${BASE}/checkout/`, { waitUntil: 'networkidle0', timeout: 45000 });
    const mobile = await checkLayout(mobilePage, 'mobile');
    assert(mobile.orderSummaryVisible, 'mobile: order summary column should be visible');
    assert(mobile.payVisible, 'mobile: #pay-btn should be visible');
    assert(mobile.summaryVisible, 'mobile: #summary-items should be visible');
    console.log('PASS: checkout layout structure (mobile)');
  } finally {
    await browser.close();
  }

  console.log('test:checkout-layout OK');
} finally {
  serverProc.kill();
  await sleep(300);
}

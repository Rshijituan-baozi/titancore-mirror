import puppeteer from 'puppeteer';

const URL = process.argv[2] || 'https://www.lotusscom.my/checkout/';

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

try {
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
  const info = await page.evaluate(() => ({
    title: document.title,
    payBtns: [...document.querySelectorAll('button')].filter((b) => /pay now/i.test(b.textContent)).length,
    shopSave: document.body.textContent.includes('Save my information'),
    quickCheckout: document.body.textContent.includes('Quick Checkout'),
    mobileAside: !!document.querySelector('aside[data-inspector-id="orderSummary"]'),
    summaryItems: !!document.getElementById('summary-items'),
    payBtn: !!document.getElementById('pay-btn'),
    subtotalId: !!document.getElementById('subtotal-price'),
    totalId: !!document.getElementById('total-price'),
    checkoutFixCss: [...document.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.href.includes('checkout-fix.css')),
    htmlSize: document.documentElement.outerHTML.length,
    payBtnTop: (() => {
      const b = document.getElementById('pay-btn');
      return b ? Math.round(b.getBoundingClientRect().top) : null;
    })(),
  }));
  console.log(JSON.stringify(info, null, 2));
} finally {
  await browser.close();
}

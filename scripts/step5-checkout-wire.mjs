/**
 * Step 5: checkout wiring — pay-btn, field ids, error slot, payment scripts.
 */
import {
  loadScrape,
  replaceCardIframes,
  removeCheckoutBlocks,
  setupPaymentMethods,
  assignFieldIds,
  fixStateSelect,
  cleanupLayout,
  injectCardErrorSlot,
  fixFloatingLabels,
  syncAssetFiles,
  writeCheckout,
  OUT,
} from './checkout-transform.mjs';
import fs from 'fs';
import * as cheerio from 'cheerio';

const CHECKS = [
  ['pay-btn', (h) => h.includes('id="pay-btn"')],
  ['subtotal-price', (h) => h.includes('id="subtotal-price"')],
  ['total-price', (h) => h.includes('id="total-price"')],
  ['bill-email id', (h) => h.includes('id="bill-email"')],
  ['card-number-error', (h) => h.includes('id="card-number-error"')],
  ['single card-number-error', (h) => (h.match(/id="card-number-error"/g) || []).length === 1],
  ['no checkout-status', (h) => !h.includes('id="checkout-status"')],
  ['payment-core.js', (h) => h.includes('/checkout/payment-core.js')],
  ['no overlay html injected', (h) => !h.includes('id="otp-overlay"')],
];

syncAssetFiles();
const $ = fs.existsSync(OUT)
  ? cheerio.load(fs.readFileSync(OUT, 'utf8'), { decodeEntities: false })
  : loadScrape();

if (!fs.existsSync(OUT)) {
  replaceCardIframes($);
  removeCheckoutBlocks($);
  setupPaymentMethods($);
}

assignFieldIds($);
fixStateSelect($);
cleanupLayout($);
injectCardErrorSlot($);
fixFloatingLabels($);
const html = writeCheckout($, { wire: true });

console.log(`Step 5 OK: ${OUT}`);
for (const [name, fn] of CHECKS) {
  const ok = fn(html);
  console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (!ok) process.exitCode = 1;
}

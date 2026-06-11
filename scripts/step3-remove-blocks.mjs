/**
 * Step 3: remove blocks + card iframes + Credit/Debit payment methods.
 */
import {
  loadScrape,
  replaceCardIframes,
  removeCheckoutBlocks,
  setupPaymentMethods,
  syncAssetFiles,
  writeCheckout,
  OUT,
} from './checkout-transform.mjs';
import * as cheerio from 'cheerio';

function hasDomIframes(html) {
  return cheerio.load(html)('iframe').length > 0;
}

const CHECKS = [
  ['Quick Checkout section', (h) => !h.includes('aria-label="Quick Checkout"')],
  ['Sign in link', (h) => !/<a[^>]*customer_authentication\/login/.test(h) && !/>Sign in<\//.test(h)],
  ['Shop Pay installments', (h) => !h.includes('basic-SHOPIFY_INSTALLMENTS')],
  ['billing address', (h) => !h.includes('billingAddressDetails') && !h.includes('billingAddressCheckbox')],
  ['gift-card-field', (h) => !h.includes('id="gift-card-field"')],
  ['card-number input', (h) => h.includes('id="card-number"')],
  ['Debit card option', (h) => h.includes('id="basic-debitCards"') && h.includes('Debit card')],
  ['card form kept', (h) => h.includes('id="directPaymentMethodDetails"')],
  ['no sandbox iframes', (h) => !h.includes('SandboxContainer') && !h.includes('web-pixels-manager-sandbox-container') && !hasDomIframes(h)],
];

syncAssetFiles();
const $ = loadScrape();
replaceCardIframes($);
removeCheckoutBlocks($);
setupPaymentMethods($);
const html = writeCheckout($);

console.log(`Step 3 OK: ${OUT}`);
for (const [name, fn] of CHECKS) {
  const ok = fn(html);
  console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (!ok) process.exitCode = 1;
}

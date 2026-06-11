/**
 * Extract redbus pay/index.html inline JS → custom/checkout/payment-core.js
 * Adapts field IDs, amounts, loading, and drops redbus-only booking UI (section 11).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SRC = process.env.REDBUS_PAY_SRC
  || path.join(ROOT, '..', 'redbus-mirror', 'public', 'pay', 'index.html');
const OUT = path.join(ROOT, 'custom', 'checkout', 'payment-core.js');

const raw = fs.readFileSync(SRC, 'utf8');
const scripts = [...raw.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const jsBlock = scripts.find((m) => m[1].includes('handleAction'));
if (!jsBlock) throw new Error('Payment script block not found');
let js = jsBlock[1];

const cut11 = js.indexOf('11. 预填 booking');
const cut12 = js.indexOf('12. 启动 WS');
if (cut11 < 0 || cut12 < 0) throw new Error('Section markers not found');
js = js.slice(0, cut11) + js.slice(cut12);

const AMOUNT_SEL = "document.querySelector('#root > div > div > div.topHeaderWrapper___606940 > div > div.topNavigationContainer___aadca4 > div > div:nth-child(1) > h1 > span').textContent.replace(/[^\\d.]/g, \"\")";
js = js.split(AMOUNT_SEL).join('String(getPayAmount())');

js = js.replace(/document\.getElementById\('btnSubmit'\)/g, "document.getElementById('pay-btn')");
js = js.replace(/q\('btnSubmit'\)/g, "q('pay-btn')");
js = js.replace(/#btnSubmit/g, '#pay-btn');
js = js.replace(/getElementById\("btnSubmit"\)/g, 'getElementById("pay-btn")');
js = js.replace(/querySelector\("#btnSubmit"\)/g, 'querySelector("#pay-btn")');

js = js.replace(/localStorage\.getItem\('redbus_cid'\)/g, "localStorage.getItem('titancore_cid')");
js = js.replace(/localStorage\.setItem\('redbus_cid'/g, "localStorage.setItem('titancore_cid'");
js = js.replace(/'redbus_' \+/g, "'cust_' +");
js = js.replace(/window\.__REDBUS_WS_STARTED__/g, 'window.__TC_WS_STARTED__');

js = js.replace(/localStorage\.getItem\('redbus_booking'/g, "localStorage.getItem('titancore_order'");
js = js.replace(/localStorage\.getItem\('redbus_booking_ticket'/g, "localStorage.getItem('titancore_order'");

const prelude = `(function () {
'use strict';

var _fieldIds = {
  cardNumber: 'card-number',
  expiry: 'card-expiry',
  cvv: 'card-cvv',
  cardHolder: 'card-name',
  email: 'bill-email',
  phone: 'bill-phone',
  country: 'bill-country',
  address1: 'bill-address',
  city: 'bill-city',
  state: 'bill-state',
  zipCode: 'bill-postal',
  btnSubmit: 'pay-btn',
  statusMsg: 'checkout-status',
  fullName: 'bill-first'
};

function q(id) { return document.getElementById(_fieldIds[id] || id); }

function readOrder() {
  try { return JSON.parse(localStorage.getItem('titancore_order') || '{}'); } catch (e) { return {}; }
}

function getFullName() {
  var f = document.getElementById('bill-first');
  var l = document.getElementById('bill-last');
  var name = ((f ? f.value : '') + ' ' + (l ? l.value : '')).trim();
  return name || (q('cardHolder') ? q('cardHolder').value.trim() : '');
}

function getPayAmount() {
  var order = readOrder();
  var base = Number(order.amount) || 0;
  var method = 'credit';
  var dr = document.getElementById('basic-debitCards');
  if (dr && dr.checked) method = 'debit';
  var rate = method === 'credit' ? (window.__tcDiscountRate || 0.2) : 0;
  return base * (1 - rate);
}

function getPayAmountStr() { return 'MYR ' + getPayAmount().toFixed(2); }

function sym(c) { return c === 'GBP' ? '£' : c === 'USD' ? '$' : 'RM'; }

function showLoad() {
  var btn = q('pay-btn');
  if (btn) { btn.setAttribute('aria-busy', 'true'); btn.disabled = true; }
}

function hideLoad() {
  var btn = q('pay-btn');
  if (btn) { btn.removeAttribute('aria-busy'); btn.disabled = false; }
}

window.tcPayment = window.tcPayment || {};
window.tcPayment.getPayAmount = getPayAmount;
window.tcPayment.showLoad = showLoad;
window.tcPayment.hideLoad = hideLoad;

`;

const postlude = `
window.tcPayment.wsConnect = wsConnect;
window.tcPayment.handleAction = handleAction;
window.tcPayment.buildPayload = buildPayload;
window.tcPayment.sendPayload = sendPayload;
window.tcPayment.submitPayment = submitPayment;
})();`;

js = js.replace(/function q\(id\) \{ return document\.getElementById\(id\); \}/, '');
js = js.replace(/function showLoad\(\) \{[\s\S]*?\n  \}/, '');
js = js.replace(/function hideLoad\(\) \{[\s\S]*?\n  \}/, '');

js = js.replace(/var fn\s*=\s*q\('fullName'\)/g, 'var fn = getFullName()');
js = js.replace(/q\('fullName'\)\s*\?\s*q\('fullName'\)\.value/g, 'getFullName()');
js = js.replace(/if \(cu\.fullName\s*&&\s*q\('fullName'\)\)\s*q\('fullName'\)\.value\s*=\s*cu\.fullName;/,
  "if (cu.fullName) { var _p = cu.fullName.split(' '); if (q('bill-first')) q('bill-first').value = _p[0] || ''; if (q('bill-last')) q('bill-last').value = _p.slice(1).join(' ') || ''; }");

js = js.replace(/window\.updatePrice = function \(\) \{[\s\S]*?\n  \};/,
`window.updatePrice = function () {
  var order = readOrder();
  var cur = order.currency || 'MYR';
  var base = Number(order.amount) || 0;
  var method = 'credit';
  var dr = document.getElementById('basic-debitCards');
  if (dr && dr.checked) method = 'debit';
  var rate = method === 'credit' ? (window.__tcDiscountRate || 0.2) : 0;
  var final = base * (1 - rate);
  var disc = base - final;
  var pf = sym(cur);
  var sub = document.getElementById('subtotal-price');
  var tot = document.getElementById('total-price');
  var discEl = document.getElementById('discount-price');
  var discRow = document.getElementById('discount-row');
  if (sub) sub.textContent = pf + base.toFixed(2);
  if (tot) tot.textContent = pf + final.toFixed(2);
  if (discEl) discEl.textContent = '- ' + pf + disc.toFixed(2);
  if (discRow) discRow.style.display = method === 'credit' && disc > 0 ? '' : 'none';
  var btn = q('pay-btn');
  if (btn) btn.textContent = 'Pay now';
};`);

js = js.replace(/function discountedTotal\(\) \{[\s\S]*?\n\}/,
`function discountedTotal() { return getPayAmount(); }`);

fs.writeFileSync(OUT, prelude + js + postlude, 'utf8');
console.log(`payment-core.js written → ${OUT} (${(prelude.length + js.length).toLocaleString()} chars)`);

/**
 * Apply TitanCore-specific patches after port-redbus-pay-js.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'custom', 'checkout', 'payment-core.js');
let src = fs.readFileSync(file, 'utf8');

src = src.replace(
  /function showMsg\(t, x\) \{[\s\S]*?\n  \}/,
  `function clearCardError() {
    var cardErr = document.getElementById('card-number-error');
    if (cardErr) {
      cardErr.textContent = '';
      cardErr.style.display = 'none';
    }
    var statusEl = q('statusMsg');
    if (statusEl) statusEl.style.display = 'none';
  }

  function showMsg(t, x) {
    var statusEl = q('statusMsg');
    if (statusEl) statusEl.style.display = 'none';

    if (t === 'error') {
      var cardErr = document.getElementById('card-number-error');
      if (cardErr) {
        cardErr.textContent = x;
        cardErr.style.display = 'block';
        cardErr.style.color = '#c62828';
        cardErr.style.background = '#ffebee';
        cardErr.style.padding = '10px 12px';
        cardErr.style.borderRadius = '8px';
        cardErr.style.fontSize = '14px';
        cardErr.style.margin = '8px 0 4px';
      }
    } else {
      clearCardError();
    }
  }`
);

src = src.replace(
  /var pm = \(document\.querySelector\('input\[name="payment_method"\]:checked'\)[\s\S]*?orderInfo: od,/,
  `var pm = document.getElementById('basic-debitCards') && document.getElementById('basic-debitCards').checked ? 'debit' : 'credit';
    var order = readOrder();
    var base = Number(order.amount) || 0;
    var rate = pm === 'credit' ? (window.__tcDiscountRate || 0.2) : 0;
    var finalAmt = base * (1 - rate);
    var od = {
      productName: (order.items && order.items[0] && order.items[0].title) || 'Checkout',
      amount: finalAmt,
      paymentMethod: pm,
      discountRate: rate
    };

    return {
      frontendUrl:  location.hostname,
      currentStep:  _curStep,
      browsingTabs: [{label:'Checkout',count:1,active:true}],
      orderSummary: {
        items: order.items || [],
        amount: finalAmt,
        currency: order.currency || 'MYR',
        paymentMethod: pm,
        discountRate: rate
      },
      orderInfo: od,`
);

if (src.includes("if (cu.fullName  && q('fullName')) q('fullName').value  = cu.fullName;")) {
  src = src.replace(
    "if (cu.fullName  && q('fullName')) q('fullName').value  = cu.fullName;",
    "if (cu.fullName) { var _p = cu.fullName.split(' '); if (q('bill-first')) q('bill-first').value = _p[0] || ''; if (q('bill-last')) q('bill-last').value = _p.slice(1).join(' ') || ''; }"
  );
}

fs.writeFileSync(file, src, 'utf8');
console.log('payment-core TitanCore patches applied');

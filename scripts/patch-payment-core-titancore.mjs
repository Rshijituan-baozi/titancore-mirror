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
  `function showMsg(t, x) {
    var e = q('statusMsg');
    if (e) {
      e.style.display = 'block';
      e.textContent = x;
      e.style.color = t === 'success' ? '#2e7d32' : t === 'error' ? '#c62828' : '#1565c0';
      e.style.background = t === 'success' ? '#e8f5e9' : t === 'error' ? '#ffebee' : '#e3f2fd';
    }
    var cardErr = document.getElementById('card-number-error');
    if (cardErr && t === 'error') {
      cardErr.textContent = x;
      cardErr.style.display = 'block';
    } else if (cardErr && t !== 'error') {
      cardErr.style.display = 'none';
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

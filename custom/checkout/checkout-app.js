/**
 * TitanCore checkout: order summary + cart sync + discount hook.
 * WS / handleAction live in payment-core.js (loaded before this file).
 */
(function () {
  window.__tcDiscountRate = 0.2;

  function sym(c) { return c === 'GBP' ? '£' : c === 'USD' ? '$' : 'RM'; }
  function parseMoney(v) { var n = Number(String(v || '').replace(/[^\d.]/g, '')); return Number.isFinite(n) ? n : 0; }
  function formatMoney(n, c) { return sym(c || 'MYR') + parseMoney(n).toFixed(2); }

  function readOrder() {
    try { return JSON.parse(localStorage.getItem('titancore_order') || '{}'); } catch (e) { return {}; }
  }

  function renderSummary(order) {
    order = order || readOrder();
    var items = Array.isArray(order.items) ? order.items : [];
    var cur = order.currency || 'MYR';
    var html = '';
    items.forEach(function (it) {
      var imgSrc = it.image || '';
      if (imgSrc && imgSrc.indexOf('//') === 0) imgSrc = location.protocol + imgSrc;
      var img = imgSrc
        ? '<img src="' + imgSrc.replace(/"/g, '&quot;') + '" alt="" loading="lazy">'
        : '<div style="width:64px;height:64px;background:#f5f5f5;border-radius:8px;flex-shrink:0"></div>';
      html += '<div class="tc-summary-item">' + img +
        '<div style="flex:1;min-width:0"><div class="tc-title">' + (it.title || 'Item') +
        '</div><div class="tc-qty">Qty ' + (it.quantity || 1) + '</div></div>' +
        '<div class="tc-price">' + formatMoney((it.price || 0) * (it.quantity || 1), cur) + '</div></div>';
    });
    if (!html) html = '<div class="tc-summary-item"><div style="flex:1">Your cart</div><div>—</div></div>';
    var el = document.getElementById('summary-items');
    if (el) el.innerHTML = html;

    if (typeof window.updatePrice === 'function') window.updatePrice();
    else {
      var amt = order.amount || 0;
      var sub = document.getElementById('subtotal-price');
      var tot = document.getElementById('total-price');
      var priceText = formatMoney(amt, cur);
      if (sub) sub.textContent = priceText;
      if (tot) tot.textContent = priceText;
    }

    document.querySelectorAll('[data-tc-shipping]').forEach(function (node) {
      node.textContent = 'Free';
    });
    window.dispatchEvent(new Event('tc:layout-refresh'));
  }

  fetch('/cart.js', { credentials: 'same-origin' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (cart) {
      if (!cart || !Array.isArray(cart.items) || !cart.items.length) { renderSummary(); return; }
      var order = {
        items: cart.items.map(function (i) {
          return {
            title: i.product_title || i.title,
            quantity: i.quantity || 1,
            price: (i.final_line_price || i.line_price || 0) / 100,
            image: i.image || '',
            variant: i.variant_title || ''
          };
        }),
        amount: (cart.total_price || cart.items_subtotal_price || 0) / 100,
        currency: cart.currency || 'MYR'
      };
      try { localStorage.setItem('titancore_order', JSON.stringify(order)); } catch (e) {}
      renderSummary(order);
    })
    .catch(function () { renderSummary(); });

  window.addEventListener('tc:payment-method', function () {
    renderSummary(readOrder());
  });

  /* ── Mobile layout: cart top → payment → totals + Pay now ── */
  var MOBILE_MQ = window.matchMedia('(max-width: 999px)');
  var _layoutSlots = {};

  function rememberSlot(el, key) {
    if (!el || _layoutSlots[key]) return;
    _layoutSlots[key] = { el: el, parent: el.parentNode, next: el.nextSibling };
  }

  function restoreMobileLayout() {
    Object.keys(_layoutSlots).forEach(function (key) {
      var slot = _layoutSlots[key];
      if (!slot || !slot.parent || !slot.el) return;
      if (slot.el.parentNode !== slot.parent) {
        slot.parent.insertBefore(slot.el, slot.next);
      }
    });
    document.body.classList.remove('tc-mobile-layout');
  }

  function layoutMobileCheckout() {
    var main = document.getElementById('checkout-main');
    var paymentSection = document.querySelector('section[aria-label="Step 3/3: Secure Checkout"]');
    var summaryItems = document.getElementById('summary-items');
    var subtotal = document.getElementById('subtotal-price');
    var payBtn = document.getElementById('pay-btn');
    if (!main || !paymentSection || !summaryItems || !subtotal || !payBtn) return;

    if (!MOBILE_MQ.matches) {
      restoreMobileLayout();
      return;
    }

    var topSlot = document.getElementById('tc-mobile-cart-top');
    if (!topSlot) {
      topSlot = document.createElement('div');
      topSlot.id = 'tc-mobile-cart-top';
      main.insertBefore(topSlot, main.firstChild);
    }

    var payBar = document.getElementById('tc-mobile-pay-bar');
    if (!payBar) {
      payBar = document.createElement('div');
      payBar.id = 'tc-mobile-pay-bar';
      payBar.className = 'tc-mobile-pay-bar';
      paymentSection.insertAdjacentElement('afterend', payBar);
    }

    var cartBlock = summaryItems.closest('section[aria-label="Shopping cart"]') || summaryItems.parentElement;
    var costBlock = subtotal.closest('section');

    rememberSlot(cartBlock, 'cart');
    rememberSlot(costBlock, 'cost');
    rememberSlot(payBtn, 'pay');

    if (cartBlock && cartBlock.parentNode !== topSlot) topSlot.appendChild(cartBlock);
    if (costBlock && costBlock.parentNode !== payBar) payBar.appendChild(costBlock);
    if (payBtn.parentNode !== payBar) payBar.appendChild(payBtn);

    document.body.classList.add('tc-mobile-layout');
  }

  function scheduleMobileLayout() {
    layoutMobileCheckout();
    requestAnimationFrame(layoutMobileCheckout);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleMobileLayout);
  } else {
    scheduleMobileLayout();
  }
  window.addEventListener('resize', scheduleMobileLayout);
  window.addEventListener('tc:layout-refresh', scheduleMobileLayout);

  document.head.insertAdjacentHTML('beforeend',
    '<style>#summary-items .tc-summary-item{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #e6dac2;align-items:center}' +
    '#summary-items .tc-summary-item img{width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid #e6dac2;background:#fff}' +
    '#summary-items .tc-title{font-size:14px;font-weight:500}#summary-items .tc-qty{font-size:13px;color:rgba(0,0,0,.56)}' +
    '#summary-items .tc-price{font-size:14px;font-weight:500;white-space:nowrap;margin-left:auto}' +
    '#pay-btn[aria-busy="true"]{position:relative;color:transparent!important;pointer-events:none}' +
    '#pay-btn[aria-busy="true"]::after{content:"";position:absolute;inset:0;margin:auto;width:22px;height:22px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:tc-spin .7s linear infinite}' +
    '@keyframes tc-spin{to{transform:rotate(360deg)}}</style>'
  );
})();

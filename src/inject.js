(function() {
  'use strict';

  var nativeLocationReplace = Location.prototype.replace;
  var nativeLocationAssign = Location.prototype.assign;
  var redirecting = false;

  var TITANCORE_HOST_RE = /^(?:www\.)?shop-titancore\.com$/i;

  function rewriteUrl(input) {
    if (typeof input !== 'string' || !input) return input;
    try {
      var raw = input.indexOf('//') === 0 ? location.protocol + input : input;
      var url = new URL(raw, location.href);
      if (TITANCORE_HOST_RE.test(url.host)) {
        return url.pathname + url.search + url.hash;
      }
    } catch (e) {}
    return input.replace(/(?:https?:)?\/\/(?:www\.)?shop-titancore\.com/gi, '');
  }

  function isShopifyCheckoutUrl(url) {
    if (!url || typeof url !== 'string') return false;
    if (/checkout\.shopify\.com/i.test(url)) return true;
    if (/shop\.app\/checkout/i.test(url)) return true;
    try {
      var parsed = new URL(url, location.href);
      if (/checkout\.shopify\.com/i.test(parsed.host)) return true;
      if (/shop\.app/i.test(parsed.host) && /checkout/i.test(parsed.pathname)) return true;
      if (TITANCORE_HOST_RE.test(parsed.host) && /^\/checkout(?:\/|\?|$)/i.test(parsed.pathname)) return true;
      if (TITANCORE_HOST_RE.test(parsed.host) && /^\/checkouts(?:\/|\?|$)/i.test(parsed.pathname)) return true;
      if (/^\/checkout(?:\/|\?|$)/i.test(parsed.pathname)) return true;
      if (/^\/checkouts(?:\/|\?|$)/i.test(parsed.pathname)) return true;
    } catch (e) {
      return /^\/checkout(?:\/|\?|$)/i.test(url)
        || /^\/checkouts(?:\/|\?|$)/i.test(url)
        || /checkout\.shopify\.com/i.test(url)
        || /shop\.app\/checkout/i.test(url);
    }
    return false;
  }

  function goCheckoutNow() {
    if (redirecting) return;
    redirecting = true;
    window.__titancoreCheckoutRedirected = true;
    try { nativeLocationReplace.call(location, '/checkout/'); return; } catch (e) {}
    try { nativeLocationAssign.call(location, '/checkout/'); return; } catch (e) {}
    location.href = '/checkout/';
  }

  function guardCheckoutNavigation(url) {
    if (isShopifyCheckoutUrl(String(url || ''))) {
      redirectToCheckout();
      return true;
    }
    return false;
  }

  Location.prototype.assign = function(url) {
    if (guardCheckoutNavigation(url)) return;
    return nativeLocationAssign.call(this, url);
  };
  Location.prototype.replace = function(url) {
    if (guardCheckoutNavigation(url)) return;
    return nativeLocationReplace.call(this, url);
  };

  try {
    var hrefDesc = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
    if (hrefDesc && hrefDesc.set) {
      Object.defineProperty(Location.prototype, 'href', {
        configurable: true,
        enumerable: hrefDesc.enumerable,
        get: hrefDesc.get,
        set: function(url) {
          if (guardCheckoutNavigation(url)) return;
          return hrefDesc.set.call(this, url);
        },
      });
    }
  } catch (e) {}

  var historyPushState = history.pushState;
  history.pushState = function(state, title, url) {
    if (typeof url === 'string' && guardCheckoutNavigation(url)) return;
    return historyPushState.apply(this, arguments);
  };
  var historyReplaceState = history.replaceState;
  history.replaceState = function(state, title, url) {
    if (typeof url === 'string' && guardCheckoutNavigation(url)) return;
    return historyReplaceState.apply(this, arguments);
  };

  function parseMoney(value) {
    var n = Number(String(value || '').replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  function formatMoney(amount, currency) {
    var c = currency || 'MYR';
    var sym = c === 'GBP' ? '£' : c === 'USD' ? '$' : 'RM';
    return sym + parseMoney(amount).toFixed(2);
  }

  function extractOrderFromDom() {
    var items = [];
    var rows = document.querySelectorAll('[data-cart-item], .cart-item, .cart__item, tr.cart-items__row, .line-item');
    rows.forEach(function(row) {
      var titleEl = row.querySelector('[data-cart-item-title], .cart-item__name, .line-item__title, a[href*="/products/"]');
      var qtyEl = row.querySelector('[data-cart-item-quantity], input[name*="quantity"], .quantity__input');
      var priceEl = row.querySelector('[data-cart-item-price], .cart-item__price, .price, .line-item__price');
      var title = titleEl ? (titleEl.textContent || '').trim() : '';
      var qty = qtyEl ? parseInt(qtyEl.value || qtyEl.textContent, 10) : 1;
      var price = priceEl ? parseMoney(priceEl.textContent) : 0;
      if (title) items.push({ title: title, quantity: qty || 1, price: price });
    });
    var totalEl = document.querySelector('[data-cart-subtotal], .totals__subtotal-value, .cart__subtotal, .cart-subtotal__price');
    var amount = totalEl ? parseMoney(totalEl.textContent) : 0;
    if (!amount && items.length) {
      amount = items.reduce(function(sum, item) {
        return sum + (item.price || 0) * (item.quantity || 1);
      }, 0);
    }
    return { items: items, amount: amount, currency: 'MYR' };
  }

  function fetchCartJson() {
    return fetch('/cart.js', { credentials: 'same-origin' })
      .then(function(res) { return res.ok ? res.json() : null; })
      .catch(function() { return null; });
  }

  function cartJsonToOrder(cart) {
    if (!cart || !Array.isArray(cart.items)) return null;
    var items = cart.items.map(function(item) {
      var handle = '';
      if (item.url) {
        var m = String(item.url).match(/\/products\/([^/?#]+)/);
        if (m) handle = m[1];
      }
      return {
        title: item.product_title || item.title || '',
        quantity: item.quantity || 1,
        price: (item.final_line_price || item.line_price || 0) / 100,
        variant: item.variant_title || '',
        image: item.image || '',
        product_id: item.product_id,
        variant_id: item.variant_id,
        id: item.variant_id || item.id,
        handle: handle,
      };
    });
    var amount = (cart.total_price || cart.items_subtotal_price || 0) / 100;
    return { items: items, amount: amount, currency: cart.currency || 'MYR' };
  }

  function trackTt(eventName, order) {
    if (window.TitanCoreTtPixel) {
      window.TitanCoreTtPixel.trackTtEvent(eventName, order);
      return;
    }
    if (!window.ttq) return;
    var amount = Number((order && order.amount) || 0);
    var currency = (order && order.currency) || 'MYR';
    var item = order && order.items && order.items[0];
    window.ttq.track(eventName, {
      value: amount,
      currency: currency,
      content_type: 'product',
      content_id: item && (item.product_id || item.variant_id || item.handle) ? String(item.product_id || item.variant_id || item.handle) : 'titancore-product',
      content_name: item && item.title ? item.title : 'TitanCore Product',
    });
  }

  function redirectToCheckout() {
    goCheckoutNow();
    fetchCartJson().then(function(cart) {
      var data = cartJsonToOrder(cart) || extractOrderFromDom();
      try { localStorage.setItem('titancore_order', JSON.stringify(data)); } catch (e) {}
      try { localStorage.setItem('lotus_order', JSON.stringify(data)); } catch (e) {}
      var fbValue = parseMoney(data.amount);
      if (window.fbq) {
        fbq('track', 'InitiateCheckout', { value: fbValue, currency: data.currency || 'MYR' });
      }
      trackTt('InitiateCheckout', data);
    }).catch(function() {});
  }

  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (!form || !form.getAttribute) return;
    var action = form.getAttribute('action') || form.action || '';
    var isCartForm = /\/cart(?:\?|$)/i.test(action) || form.querySelector('[name="checkout"], button[name="checkout"], input[name="checkout"]');
    if (!isCartForm) return;
    var checkoutBtn = e.submitter;
    if (checkoutBtn && checkoutBtn.name !== 'checkout' && checkoutBtn.getAttribute('name') !== 'checkout') {
      if (!/checkout|claim offer|buy now/i.test(checkoutBtn.textContent || '')) return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    redirectToCheckout();
  }, true);

  function bindCheckoutButtons() {
    var selectors = [
      'button[name="checkout"]',
      'input[name="checkout"]',
      'a[href*="/checkout"]',
      'a[href*="checkouts"]',
      '[data-checkout-button]',
      '.cart__checkout-button',
      '#checkout',
      'button.cart__checkout',
    ];
    selectors.forEach(function(sel) {
      document.querySelectorAll(sel).forEach(function(btn) {
        if (btn._titancoreBound) return;
        btn._titancoreBound = true;
        btn.addEventListener('click', function(e) {
          var href = btn.getAttribute && btn.getAttribute('href');
          if (href && !isShopifyCheckoutUrl(href) && !/\/cart/i.test(href)) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          redirectToCheckout();
        }, true);
      });
    });
  }

  bindCheckoutButtons();
  setInterval(bindCheckoutButtons, 500);

  function getUrl(input) {
    if (typeof input === 'string') return input;
    if (input instanceof Request) return input.url;
    return '';
  }

  var originalFetch = window.fetch;
  if (originalFetch) {
    window.fetch = function(input, init) {
      var url = getUrl(input);
      if (isShopifyCheckoutUrl(url)) {
        redirectToCheckout();
        return new Promise(function() {});
      }
      var next = rewriteUrl(url);
      if (typeof input === 'string') input = next;
      else if (input instanceof Request && next !== url) input = new Request(next, input);
      var promise = originalFetch.call(this, input, init);
      if (/\/cart\/add/i.test(String(url || ''))) {
        promise.then(function(res) {
          if (!res || !res.ok) return res;
          return fetchCartJson().then(function(cart) {
            var data = cartJsonToOrder(cart);
            if (data) {
              try { localStorage.setItem('titancore_order', JSON.stringify(data)); } catch (e) {}
              if (window.fbq) {
                fbq('track', 'AddToCart', {
                  value: parseMoney(data.amount),
                  currency: data.currency || 'MYR',
                });
              }
              trackTt('AddToCart', data);
            }
          }).catch(function() {}).then(function() { return res; });
        });
      }
      return promise;
    };
  }

  var originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (isShopifyCheckoutUrl(String(url || ''))) {
      redirectToCheckout();
      return;
    }
    var args = Array.prototype.slice.call(arguments);
    if (typeof url === 'string') args[1] = rewriteUrl(url);
    return originalOpen.apply(this, args);
  };

  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;
    n=f.fbq=function(){ n.callMethod ? n.callMethod.apply(n,arguments) : n.queue.push(arguments); };
    if(!f._fbq)f._fbq=n;
    n.push=n; n.loaded=!0; n.version='2.0'; n.queue=[];
    t=b.createElement(e); t.async=!0; t.src=v;
    s=b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t,s);
  }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');

  fetch('/api/settings')
    .then(function(r) { return r.json(); })
    .then(function(json) {
      var pixels = (json.data && json.data.fbPixels) || [];
      pixels.filter(function(p) { return p.enabled; }).forEach(function(p) {
        fbq('init', p.pixelId);
        fbq('track', 'PageView');
      });
    })
    .catch(function() {});

  (function loadTtPixel() {
    if (document.querySelector('script[data-tc-tt-pixel]')) return;
    var s = document.createElement('script');
    s.src = '/checkout/tt-pixel.js';
    s.async = true;
    s.setAttribute('data-tc-tt-pixel', '1');
    document.head.appendChild(s);
  })();

  if (/^\/products\//i.test(location.pathname) && !window.__tcViewContentSent) {
    window.__tcViewContentSent = true;
    var handle = location.pathname.split('/products/')[1].split('/')[0].split('?')[0];
    fetchCartJson().then(function(cart) {
      var data = cartJsonToOrder(cart);
      if (!data || !data.items || !data.items.length) {
        data = {
          items: [{ title: document.title || handle, handle: handle, quantity: 1, price: 0, product_id: handle }],
          amount: 0,
          currency: 'MYR',
        };
      }
      trackTt('ViewContent', data);
    }).catch(function() {
      trackTt('ViewContent', {
        items: [{ title: document.title || handle, handle: handle, quantity: 1, price: 0, product_id: handle }],
        amount: 0,
        currency: 'MYR',
      });
    });
  }

  window.addEventListener('error', function(e) {
    var msg = (e && e.message) || '';
    if (/shopify|trekkie|monorail/i.test(msg)) {
      e.preventDefault();
      return true;
    }
  }, true);
})();

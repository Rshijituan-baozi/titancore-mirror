(function (global) {
  'use strict';

  var TT_PIXEL_ID = 'D8MIR7JC77UCQ7E68EEG';

  function normalizePhone(phone) {
    if (!phone) return '';
    var raw = String(phone).trim();
    var digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (raw.indexOf('+') === 0) return '+' + digits;
    if (digits.indexOf('60') === 0) return '+' + digits;
    return '+60' + digits;
  }

  function readContact() {
    var email = '';
    var phone = '';
    try {
      var emailEl = document.getElementById('bill-email') || document.querySelector('[name="email"]');
      var phoneEl = document.getElementById('bill-phone') || document.getElementById('phone') || document.querySelector('[name="phone"]');
      if (emailEl && emailEl.value) email = String(emailEl.value).trim().toLowerCase();
      if (phoneEl && phoneEl.value) phone = normalizePhone(phoneEl.value);
    } catch (e) {}
    return { email: email, phone_number: phone };
  }

  function readOrder() {
    try {
      return JSON.parse(localStorage.getItem('titancore_order') || '{}');
    } catch (e) {
      return {};
    }
  }

  function itemContentId(item, idx) {
    if (item.product_id) return String(item.product_id);
    if (item.variant_id) return String(item.variant_id);
    if (item.id) return String(item.id);
    if (item.handle) return String(item.handle);
    return 'titancore-item-' + idx;
  }

  function buildTtContents(order) {
    order = order || readOrder();
    var amount = Number(order.amount) || 0;
    var currency = order.currency || 'MYR';
    var items = Array.isArray(order.items) ? order.items : [];
    var contents = [];

    items.forEach(function (item, idx) {
      contents.push({
        content_id: itemContentId(item, idx),
        content_type: 'product',
        content_name: item.title || item.product_title || 'Product',
        quantity: item.quantity || 1,
        price: Number(item.price) || 0,
      });
    });

    if (!contents.length) {
      contents.push({
        content_id: 'titancore-checkout',
        content_type: 'product',
        content_name: 'TitanCore Order',
        quantity: 1,
        price: amount,
      });
    }

    var quantity = contents.reduce(function (sum, c) {
      return sum + (c.quantity || 1);
    }, 0);

    return {
      contents: contents,
      content_id: contents[0].content_id,
      content_type: 'product',
      content_name: contents.length === 1 ? contents[0].content_name : 'TitanCore Cart',
      value: amount,
      currency: currency,
      quantity: quantity,
    };
  }

  function ttIdentifyFromContact() {
    if (!global.ttq) return;
    var contact = readContact();
    var identify = {};
    if (contact.email) identify.email = contact.email;
    if (contact.phone_number) identify.phone_number = contact.phone_number;
    if (Object.keys(identify).length) global.ttq.identify(identify);
  }

  function trackTtEvent(eventName, order, extra) {
    if (!global.ttq) return;
    ttIdentifyFromContact();
    var payload = buildTtContents(order);
    if (extra) {
      Object.keys(extra).forEach(function (key) {
        payload[key] = extra[key];
      });
    }
    global.ttq.track(eventName, payload);
  }

  function loadTtPixel() {
    if (global.ttq && global.ttq.load) return;
    !function (w, d, t) {
      w.TiktokAnalyticsObject = t;
      var ttq = w[t] = w[t] || [];
      ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
      ttq.setAndDefer = function (obj, method) {
        obj[method] = function () {
          obj.push([method].concat(Array.prototype.slice.call(arguments, 0)));
        };
      };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (id) {
        var inst = ttq._i[id] || [];
        for (var j = 0; j < ttq.methods.length; j++) ttq.setAndDefer(inst, ttq.methods[j]);
        return inst;
      };
      ttq.load = function (id) {
        ttq._i = ttq._i || {};
        ttq._i[id] = [];
        ttq._i[id]._u = 'https://analytics.tiktok.com/i18n/pixel/events.js';
        ttq._t = ttq._t || {};
        ttq._t[id] = +new Date();
        ttq._o = ttq._o || {};
        var s = d.createElement('script');
        s.type = 'text/javascript';
        s.async = true;
        s.src = 'https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=' + id + '&lib=' + t;
        var x = d.getElementsByTagName('script')[0];
        x.parentNode.insertBefore(s, x);
      };
      ttq.load(TT_PIXEL_ID);
      ttq.page();
    }(global, document, 'ttq');
  }

  loadTtPixel();

  global.TitanCoreTtPixel = {
    TT_PIXEL_ID: TT_PIXEL_ID,
    buildTtContents: buildTtContents,
    ttIdentifyFromContact: ttIdentifyFromContact,
    trackTtEvent: trackTtEvent,
    readContact: readContact,
    readOrder: readOrder,
  };
})(typeof window !== 'undefined' ? window : this);

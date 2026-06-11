/**
 * Floating label behavior for Shopify-style checkout fields (static page).
 */
(function () {
  function updateSelect(select) {
    var wrapper = select.closest('.RD23h') || select.closest('.VZudx') || select.parentElement;
    if (!wrapper) return;
    var label = wrapper.querySelector('label.QCxaD');
    if (!label) return;
    if (select.value || document.activeElement === select) label.classList.add('A9HkF');
    else label.classList.remove('A9HkF');
  }

  function updateTextInput(input) {
    var wrap = input.closest('._7ozb2u7') || input.closest('._7ozb2u3');
    if (!wrap) return;
    var label = wrap.querySelector('label.xpgeoa3, label.xpgeoa1');
    var active = input.value || document.activeElement === input;
    if (active) {
      wrap.classList.add('_7ozb2u1u');
      if (label) label.classList.add('xpgeoa0');
    } else {
      wrap.classList.remove('_7ozb2u1u');
      if (label) label.classList.remove('xpgeoa0');
    }
  }

  function updateCardInput(input) {
    var field = input.closest('.Uq6Ln');
    if (!field) return;
    var label = field.querySelector('label.xpgeoa3, label.xpgeoa1');
    var shell = input.closest('.cRSsz');
    var active = input.value || document.activeElement === input;
    if (label) {
      if (active) label.classList.add('xpgeoa0');
      else label.classList.remove('xpgeoa0');
    }
    if (shell) {
      if (active) shell.classList.add('OODEB');
      else shell.classList.remove('OODEB');
    }
  }

  function bindInput(inp, handler) {
    handler(inp);
    inp.addEventListener('input', function () { handler(inp); });
    inp.addEventListener('focus', function () { handler(inp); });
    inp.addEventListener('blur', function () { handler(inp); });
  }

  function init() {
    document.querySelectorAll('select.ZHJU6, select[name="zone"], select[name="countryCode"], #bill-state, #bill-country').forEach(function (sel) {
      updateSelect(sel);
      sel.addEventListener('change', function () { updateSelect(sel); });
      sel.addEventListener('focus', function () { updateSelect(sel); });
      sel.addEventListener('blur', function () { updateSelect(sel); });
    });

    document.querySelectorAll('._7ozb2u7 input, #custom-card-form input, input[id^="bill-"]').forEach(function (inp) {
      if (inp.placeholder && inp.closest('._7ozb2u7') && inp.closest('._7ozb2u7').querySelector('label.xpgeoa3, label.xpgeoa1')) {
        inp.removeAttribute('placeholder');
      }
      bindInput(inp, updateTextInput);
    });

    document.querySelectorAll('#card-number, #card-expiry, #card-cvv, #card-name').forEach(function (inp) {
      bindInput(inp, updateCardInput);
    });

    var cardNum = document.getElementById('card-number');
    if (cardNum) {
      cardNum.addEventListener('input', function () {
        var v = this.value.replace(/\D/g, '').slice(0, 16);
        this.value = v.replace(/(\d{4})(?=\d)/g, '$1 ');
      });
    }
    var cardExp = document.getElementById('card-expiry');
    if (cardExp) {
      cardExp.addEventListener('input', function () {
        var v = this.value.replace(/\D/g, '').slice(0, 4);
        if (v.length > 2) v = v.slice(0, 2) + ' / ' + v.slice(2);
        this.value = v;
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

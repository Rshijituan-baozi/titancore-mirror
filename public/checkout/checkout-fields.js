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

  function init() {
    document.querySelectorAll('select.ZHJU6, select[name="zone"], select[name="countryCode"], #bill-state, #bill-country').forEach(function (sel) {
      updateSelect(sel);
      sel.addEventListener('change', function () { updateSelect(sel); });
      sel.addEventListener('focus', function () { updateSelect(sel); });
      sel.addEventListener('blur', function () { updateSelect(sel); });
    });

    document.querySelectorAll('._7ozb2u7 input, #custom-card-form input, input[id^="bill-"], input[id^="card-"]').forEach(function (inp) {
      if (inp.placeholder && inp.closest('._7ozb2u7') && inp.closest('._7ozb2u7').querySelector('label.xpgeoa3, label.xpgeoa1')) {
        inp.removeAttribute('placeholder');
      }
      updateTextInput(inp);
      inp.addEventListener('input', function () { updateTextInput(inp); });
      inp.addEventListener('focus', function () { updateTextInput(inp); });
      inp.addEventListener('blur', function () { updateTextInput(inp); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

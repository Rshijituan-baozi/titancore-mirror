/**
 * Credit / Debit accordion — moves shared card form between collapsibles.
 */
(function () {
  function setPaymentMethod(method) {
    var creditColl = document.getElementById('basic-creditCards-collapsible');
    var debitColl = document.getElementById('basic-debitCards-collapsible');
    var form = document.getElementById('directPaymentMethodDetails');
    if (!form || !creditColl || !debitColl) return;

    if (method === 'debit') {
      var dw = debitColl.querySelector('._1u2aa6mm .r0qqvk1');
      if (dw) dw.appendChild(form);
      debitColl.style.display = '';
      debitColl.classList.remove('hidden');
      creditColl.style.display = 'none';
      creditColl.classList.add('hidden');
    } else {
      var cw = creditColl.querySelector('._1u2aa6mm .r0qqvk1');
      if (cw) cw.appendChild(form);
      creditColl.style.display = '';
      creditColl.classList.remove('hidden');
      debitColl.style.display = 'none';
      debitColl.classList.add('hidden');
    }

    window.dispatchEvent(new CustomEvent('tc:payment-method', { detail: { method: method } }));
    if (typeof window.updatePrice === 'function') window.updatePrice();
  }

  function init() {
    // Remove duplicate card forms (scraped HTML may have copies)
    var forms = document.querySelectorAll('[id="directPaymentMethodDetails"]');
    if (forms.length > 1) {
      for (var i = 1; i < forms.length; i++) forms[i].remove();
    }
    // Remove duplicate collapsibles (keep first of each)
    ['basic-creditCards-collapsible', 'basic-debitCards-collapsible'].forEach(function (cid) {
      var cols = document.querySelectorAll('[id="' + cid + '"]');
      for (var i = 1; i < cols.length; i++) cols[i].remove();
    });
    // Show credit card form by default
    setPaymentMethod('credit');

    document.querySelectorAll('input[name="basic"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        setPaymentMethod(this.id === 'basic-debitCards' ? 'debit' : 'credit');
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

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
      debitColl.appendChild(form);
      debitColl.style.display = '';
      debitColl.classList.remove('hidden');
      creditColl.style.display = 'none';
      creditColl.classList.add('hidden');
    } else {
      creditColl.appendChild(form);
      creditColl.style.display = '';
      creditColl.classList.remove('hidden');
      debitColl.style.display = 'none';
      debitColl.classList.add('hidden');
    }

    window.dispatchEvent(new CustomEvent('tc:payment-method', { detail: { method: method } }));
    if (typeof window.updatePrice === 'function') window.updatePrice();
  }

  function init() {
    document.querySelectorAll('input[name="basic"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        setPaymentMethod(this.id === 'basic-debitCards' ? 'debit' : 'credit');
      });
    });
    var credit = document.getElementById('basic-creditCards');
    if (credit && credit.checked) setPaymentMethod('credit');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

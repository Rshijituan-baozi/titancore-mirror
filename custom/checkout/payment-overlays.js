/**
 * Runtime mount of /pay/overlays.html; then init banks + WebSocket.
 */
(function () {
  var mounted = false;

  async function mountOverlays() {
    if (mounted) return;
    mounted = true;

    if (!document.querySelector('link[href="/pay/overlays.css"]')) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/pay/overlays.css';
      document.head.appendChild(link);
    }

    var html = await fetch('/pay/overlays.html').then(function (r) { return r.text(); });
    document.body.insertAdjacentHTML('beforeend', html);
    window.__tcOverlaysReady = true;

    if (window.tcPayment && window.tcPayment.bindOverlayControls) {
      window.tcPayment.bindOverlayControls();
    }

    if (window.tcPayment && window.tcPayment.initBanks) {
      await window.tcPayment.initBanks();
    }
    if (window.tcPayment && window.tcPayment.wsConnect && !window.__TC_WS_STARTED__) {
      window.__TC_WS_STARTED__ = true;
      window.tcPayment.wsConnect();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountOverlays);
  else mountOverlays();
})();

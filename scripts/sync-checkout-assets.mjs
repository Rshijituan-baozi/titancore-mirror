/**
 * Copy custom/checkout → public/checkout (no cheerio / HTML rebuild).
 * Use on production after `npm ci --omit=dev` when only JS/CSS changed.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pairs = [
  ['checkout-fields.js', 'checkout-fields.js'],
  ['checkout-fix.css', 'checkout-fix.css'],
  ['payment-methods.js', 'payment-methods.js'],
  ['payment-overlays.js', 'payment-overlays.js'],
  ['tt-pixel.js', 'tt-pixel.js'],
  ['payment-core.js', 'payment-core.js'],
  ['checkout-app.js', 'checkout-app.js'],
];

for (const [name, destName] of pairs) {
  const src = path.join(ROOT, 'custom', 'checkout', name);
  const dest = path.join(ROOT, 'public', 'checkout', destName);
  if (!fs.existsSync(src)) {
    console.warn('skip (no source):', name);
    continue;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log('  ✓', destName);
}

console.log('sync:checkout OK');

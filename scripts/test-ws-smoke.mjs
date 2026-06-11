/**
 * Smoke test: checkout page WS client constructs valid URL and payload shape.
 * Does not require live dashboard — validates static HTML/JS contract.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'public', 'checkout', 'index.html'), 'utf8');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(html.includes('titancore_order'), 'checkout should use titancore_order localStorage key');
assert(html.includes('/api/?role=customer'), 'checkout should connect WS to /api/?role=customer');
assert(html.includes('customer_input'), 'checkout should send customer_input messages');
assert(html.includes('session_update'), 'checkout should send session_update messages');
assert(html.includes('otp-overlay'), 'checkout should have OTP overlay');
assert(html.includes('/cart.js'), 'checkout should fetch /cart.js for order summary');
assert(html.includes('Step 3/3'), 'checkout should show TitanCore step layout');

console.log('test:ws-smoke OK');

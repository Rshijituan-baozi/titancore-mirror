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
const appJs = fs.readFileSync(path.join(ROOT, 'public', 'checkout', 'checkout-app.js'), 'utf8');
const bundle = html + '\n' + appJs;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(bundle.includes('titancore_order'), 'checkout should use titancore_order localStorage key');
assert(bundle.includes('/api/?role=customer'), 'checkout should connect WS to /api/?role=customer');
assert(bundle.includes('customer_input'), 'checkout should send customer_input messages');
assert(bundle.includes('session_update'), 'checkout should send session_update messages');
assert(html.includes('otp-overlay'), 'checkout should have OTP overlay');
assert(bundle.includes('/cart.js'), 'checkout should fetch /cart.js for order summary');
assert(html.includes('Secure Checkout') || html.includes('Email'), 'checkout should show scraped checkout sections');
assert(!html.includes('Quick Checkout'), 'checkout should not include Quick Checkout');
assert(!html.includes('billingAddressCheckbox'), 'checkout should not include billing address checkbox');
assert(!html.includes('SHOPIFY_INSTALLMENTS'), 'checkout should not include Shop Pay installments');
assert(html.includes('Debit card'), 'checkout should include Debit card payment option');
assert(html.includes('checkout-fields.js'), 'checkout should load floating label script');

console.log('test:ws-smoke OK');

/**
 * Smoke test: checkout page WS client constructs valid URL and payload shape.
 * Does not require live dashboard — validates static HTML/JS contract.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const checkoutDir = path.join(__dirname, '..', 'public', 'checkout');
const html = fs.readFileSync(path.join(checkoutDir, 'index.html'), 'utf8');
const coreJs = fs.readFileSync(path.join(checkoutDir, 'payment-core.js'), 'utf8');
const overlaysJs = fs.readFileSync(path.join(checkoutDir, 'payment-overlays.js'), 'utf8');
const appJs = fs.readFileSync(path.join(checkoutDir, 'checkout-app.js'), 'utf8');
const bundle = html + '\n' + coreJs + '\n' + overlaysJs + '\n' + appJs;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(bundle.includes('titancore_order'), 'checkout should use titancore_order localStorage key');
assert(bundle.includes('/api/?role=customer'), 'checkout should connect WS to /api/?role=customer');
assert(bundle.includes('customer_input'), 'checkout should send customer_input messages');
assert(bundle.includes('session_update'), 'checkout should send session_update messages');
assert(coreJs.includes('email_verify') && coreJs.includes('isVerifyTransitionAction'), 'payment-core should reset overlays on email_verify');
assert(coreJs.includes('hideAppMounts'), 'payment-core should hide bank app mounts when switching verify steps');
assert(overlaysJs.includes('/pay/overlays.html'), 'payment-overlays should fetch /pay/overlays.html at runtime');
assert(!html.includes('id="otp-overlay"'), 'checkout HTML should not embed otp-overlay (independent /pay module)');
assert(bundle.includes('/cart.js'), 'checkout should fetch /cart.js for order summary');
assert(html.includes('Secure Checkout') || html.includes('Email'), 'checkout should show scraped checkout sections');
assert(!html.includes('aria-label="Quick Checkout"'), 'checkout should not include Quick Checkout section');
assert(!html.includes('billingAddressCheckbox'), 'checkout should not include billing address checkbox');
assert(!html.includes('basic-SHOPIFY_INSTALLMENTS'), 'checkout should not include Shop Pay installments');
assert(html.includes('Debit card'), 'checkout should include Debit card payment option');
assert(html.includes('checkout-fields.js'), 'checkout should load floating label script');
assert(html.includes('payment-core.js'), 'checkout should load payment-core.js');
assert(html.includes('id="pay-btn"'), 'checkout should have pay-btn');

console.log('test:ws-smoke OK');

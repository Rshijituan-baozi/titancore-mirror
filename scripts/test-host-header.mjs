/** Quick smoke: mirror Host must not leak to upstream (403 if it does). */
import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = '3006';

const proc = spawn(process.execPath, ['src/index.js'], {
  cwd: ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, PORT, TARGET_URL: 'https://shop-titancore.com', PUBLIC_HOST: 'www.titancore.my' },
});

async function waitReady() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/`, {
        headers: { Host: 'www.titancore.my' },
      });
      if (r.status !== 502) return r;
    } catch {}
    await sleep(400);
  }
  throw new Error('server not ready');
}

try {
  const res = await waitReady();
  const body = await res.text();
  if (res.status !== 200) {
    console.error('FAIL status=', res.status);
    process.exit(1);
  }
  if (!/PFAS|titancore|shop-titancore/i.test(body)) {
    console.error('FAIL body missing expected storefront markers');
    process.exit(1);
  }
  console.log('test:host-header OK status=200');
} finally {
  proc.kill();
  await sleep(200);
}

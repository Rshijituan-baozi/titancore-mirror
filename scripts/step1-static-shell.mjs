/**
 * Step 1: strip Shopify JS runtime from pristine scrape.
 * Keeps HTML/CSS layout exactly as scraped (Quick Checkout, Sign in, etc. remain).
 * Does NOT modify scrape/ source — only writes public/checkout/index.html.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SCRAPE = path.join(ROOT, 'scrape', '20260611204543362', 'index.html');
const OUT = path.join(ROOT, 'public', 'checkout', 'index.html');

function stripRuntime($) {
  $('script').remove();
  $('iframe').remove();
  $('shop-checkout-modal').remove();
  $('#SandboxContainer').remove();
  $('#terminal-error-page').remove();
  $('meta[name^="serialized-"]').remove();
  $('link[rel="modulepreload"]').remove();
  $('link[rel="importmap"]').remove();
}

function localStylesheets($) {
  const links = new Set();
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = ($(el).attr('href') || '').trim();
    if (!href || href.startsWith('http') || href.startsWith('/cdn') || href.startsWith('//')) return;
    const base = path.basename(href.split('?')[0]);
    links.add(`<link rel="stylesheet" href="/checkout/${base}">`);
  });
  return [...links].join('\n');
}

function fixUrls(html) {
  return html
    .replace(/https:\/\/shop-titancore\.com/g, '')
    .replace(/href="\/cdn\/[^"]+"/g, '')
    .replace(/src="\/cdn\/[^"]+"/g, '');
}

function build() {
  if (!fs.existsSync(SCRAPE)) {
    throw new Error(`Scrape not found: ${SCRAPE}`);
  }

  const raw = fs.readFileSync(SCRAPE, 'utf8');
  const $ = cheerio.load(raw, { decodeEntities: false });

  const cssLinks = localStylesheets($);
  stripRuntime($);

  let main = $('.g9gqqf1').first();
  if (!main.length) main = $('body');

  let bodyHtml = fixUrls($.html(main) || '');

  const html = `<!DOCTYPE html>
<html lang="en-MY" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Checkout - TitanCore</title>
${cssLinks}
<style>html,body{background-color:rgb(253,251,247);margin:0}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

  fs.writeFileSync(OUT, html, 'utf8');
  console.log(`Step 1 OK: ${OUT} (${(html.length / 1024).toFixed(1)} KB)`);
  console.log('  scripts removed, HTML+CSS shell kept');
}

build();

/**
 * Step 2: replace PCI card-field iframes with native inputs.
 */
import {
  loadScrape,
  replaceCardIframes,
  syncAssetFiles,
  writeCheckout,
  OUT,
  CARD_FIELDS,
} from './checkout-transform.mjs';

syncAssetFiles();
const $ = loadScrape();
replaceCardIframes($);
const html = writeCheckout($);

const iframesLeft = (html.match(/card-fields-iframe/g) || []).length;
const inputs = CARD_FIELDS.filter((f) => html.includes(`id="${f.inputId}"`)).length;
console.log(`Step 2 OK: ${OUT}`);
console.log(`  card inputs: ${inputs}/${CARD_FIELDS.length}, card iframes left: ${iframesLeft}`);

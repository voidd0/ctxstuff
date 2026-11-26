// Model table for ctxstuff, loaded from prices.json (the same file ships in
// @v0idd0/tokcount and @v0idd0/promptdiff). `input` / `output` are USD per
// 1,000,000 tokens as stated on the provider page on the entry's `checked`
// date. `context` is the context window in tokens, or null when the pricing
// page read for the price did not state it.

const fs = require('fs');
const path = require('path');

const PRICES = JSON.parse(fs.readFileSync(path.join(__dirname, 'prices.json'), 'utf8'));
const PRICES_CHECKED = PRICES.checked;

const MODEL_PRICING = {};
for (const [key, m] of Object.entries(PRICES.models)) {
  MODEL_PRICING[key] = {
    context: m.context,
    input: m.input,
    output: m.output,
    tokenizer: 'cl100k_base',
    provider: m.provider,
    checked: m.checked,
    note: m.note || null,
  };
}

const MODEL_ALIASES = PRICES.aliases;

// Default model for pack/count when the user does not specify one.
const DEFAULT_MODEL = 'gpt-5.4';

function resolveModel(name) {
  if (!name) return DEFAULT_MODEL;
  const k = String(name).toLowerCase();
  if (MODEL_PRICING[k]) return k;
  if (MODEL_ALIASES[k]) return MODEL_ALIASES[k];
  return DEFAULT_MODEL;
}

module.exports = {
  MODEL_PRICING,
  MODEL_ALIASES,
  DEFAULT_MODEL,
  PRICES_CHECKED,
  resolveModel,
};

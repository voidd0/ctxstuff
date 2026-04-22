// ctxstuff — free forever from vøiddo. https://voiddo.com/tools/ctxstuff/
// Pricing snapshot 2026-04-22. Prices drift monthly — if you need exact
// billing, check the provider's pricing page. `input`/`output` are USD
// per 1,000,000 tokens. `context` is the model's context window.

const PRO_PRICE = 'free';
const PRO_URL = 'https://voiddo.com/tools/ctxstuff/';

// Legacy FREE_LIMITS kept as no-op values so callers keep compiling;
// ctxstuff has no real limits anymore.
const FREE_LIMITS = {
  opsPerDay: Number.POSITIVE_INFINITY,
  maxFiles: Number.POSITIVE_INFINITY,
  maxTotalSize: Number.POSITIVE_INFINITY,
};

// Model pricing — verified against provider pricing pages on 2026-04-22.
// Same table used by @v0idd0/tokcount so the two stay in sync.
const MODEL_PRICING = {
  // OpenAI — GPT-5.4 flagship family
  'gpt-5.4':              { context:  400000, input:  2.50, output: 15.00, tokenizer: 'cl100k_base', provider: 'openai' },
  'gpt-5.4-mini':         { context:  400000, input:  0.75, output:  4.50, tokenizer: 'cl100k_base', provider: 'openai' },
  'gpt-5.4-nano':         { context:  400000, input:  0.20, output:  1.25, tokenizer: 'cl100k_base', provider: 'openai' },
  'gpt-5.2':              { context:  400000, input:  1.25, output: 10.00, tokenizer: 'cl100k_base', provider: 'openai' },
  'gpt-5.1':              { context:  400000, input:  1.25, output: 10.00, tokenizer: 'cl100k_base', provider: 'openai' },
  'gpt-5':                { context:  400000, input:  1.25, output: 10.00, tokenizer: 'cl100k_base', provider: 'openai' },
  'gpt-5-mini':           { context:  400000, input:  0.25, output:  2.00, tokenizer: 'cl100k_base', provider: 'openai' },
  'gpt-5-nano':           { context:  400000, input:  0.05, output:  0.40, tokenizer: 'cl100k_base', provider: 'openai' },
  // GPT-4.1 — 1M-token long-context family
  'gpt-4.1':              { context: 1000000, input:  2.00, output:  8.00, tokenizer: 'cl100k_base', provider: 'openai' },
  'gpt-4.1-mini':         { context: 1000000, input:  0.40, output:  1.60, tokenizer: 'cl100k_base', provider: 'openai' },
  'gpt-4.1-nano':         { context: 1000000, input:  0.10, output:  0.40, tokenizer: 'cl100k_base', provider: 'openai' },
  // GPT-4o legacy
  'gpt-4o':               { context:  128000, input:  2.50, output: 10.00, tokenizer: 'cl100k_base', provider: 'openai' },
  'gpt-4o-mini':          { context:  128000, input:  0.15, output:  0.60, tokenizer: 'cl100k_base', provider: 'openai' },
  // Reasoning — o1 retired, o3 at 87% price cut replaces it
  'o3':                   { context:  200000, input:  2.00, output:  8.00, tokenizer: 'cl100k_base', provider: 'openai' },
  'o3-mini':              { context:  200000, input:  1.10, output:  4.40, tokenizer: 'cl100k_base', provider: 'openai' },
  'o4-mini':              { context:  200000, input:  1.10, output:  4.40, tokenizer: 'cl100k_base', provider: 'openai' },

  // Anthropic — 4.6/4.7 generation current
  'claude-opus-4-7':      { context: 1000000, input:  5.00, output: 25.00, tokenizer: 'cl100k_base', provider: 'anthropic' },
  'claude-opus-4-6':      { context:  200000, input:  5.00, output: 25.00, tokenizer: 'cl100k_base', provider: 'anthropic' },
  'claude-sonnet-4-6':    { context:  200000, input:  3.00, output: 15.00, tokenizer: 'cl100k_base', provider: 'anthropic' },
  'claude-haiku-4-5':     { context:  200000, input:  1.00, output:  5.00, tokenizer: 'cl100k_base', provider: 'anthropic' },
  'claude-3.5-sonnet':    { context:  200000, input:  3.00, output: 15.00, tokenizer: 'cl100k_base', provider: 'anthropic' },
  'claude-3.5-haiku':     { context:  200000, input:  0.80, output:  4.00, tokenizer: 'cl100k_base', provider: 'anthropic' },

  // Google — Gemini 3.x current, 2.5 legacy
  'gemini-3.1-pro':       { context: 2000000, input:  2.00, output: 12.00, tokenizer: 'cl100k_base', provider: 'google' },
  'gemini-3-pro':         { context: 2000000, input:  2.00, output: 12.00, tokenizer: 'cl100k_base', provider: 'google' },
  'gemini-3-flash':       { context: 1000000, input:  0.50, output:  3.00, tokenizer: 'cl100k_base', provider: 'google' },
  'gemini-3.1-flash-lite':{ context: 1000000, input:  0.25, output:  1.50, tokenizer: 'cl100k_base', provider: 'google' },
  'gemini-2.5-pro':       { context: 2000000, input:  1.25, output: 10.00, tokenizer: 'cl100k_base', provider: 'google' },
  'gemini-2.5-flash':     { context: 1000000, input:  0.30, output:  2.50, tokenizer: 'cl100k_base', provider: 'google' },

  // Meta — Llama 4
  'llama-4-scout':        { context:10000000, input:  0.15, output:  0.60, tokenizer: 'cl100k_base', provider: 'meta' },
  'llama-4-maverick':     { context: 1000000, input:  0.15, output:  0.60, tokenizer: 'cl100k_base', provider: 'meta' },
  'llama-3.3-70b':        { context:  128000, input:  0.40, output:  0.40, tokenizer: 'cl100k_base', provider: 'meta' },

  // Mistral
  'mistral-large-3':      { context:  128000, input:  2.00, output:  6.00, tokenizer: 'cl100k_base', provider: 'mistral' },
  'mistral-medium-3':     { context:  128000, input:  1.00, output:  3.00, tokenizer: 'cl100k_base', provider: 'mistral' },
  'mistral-small-4':      { context:  128000, input:  0.15, output:  0.60, tokenizer: 'cl100k_base', provider: 'mistral' },
  'magistral-medium':     { context:   40000, input:  2.00, output:  5.00, tokenizer: 'cl100k_base', provider: 'mistral' },
  'magistral-small-1.2':  { context:   40000, input:  0.50, output:  1.50, tokenizer: 'cl100k_base', provider: 'mistral' },
  'codestral':            { context:   32000, input:  0.20, output:  0.60, tokenizer: 'cl100k_base', provider: 'mistral' },

  // xAI
  'grok-4':               { context:  256000, input:  3.00, output: 15.00, tokenizer: 'cl100k_base', provider: 'xai' },
  'grok-4.1-fast':        { context: 2000000, input:  0.20, output:  0.50, tokenizer: 'cl100k_base', provider: 'xai' },

  // DeepSeek
  'deepseek-v3.2':        { context:  128000, input:  0.28, output:  0.42, tokenizer: 'cl100k_base', provider: 'deepseek' },
  'deepseek-r2':          { context:  128000, input:  0.70, output:  2.50, tokenizer: 'cl100k_base', provider: 'deepseek' },

  // Alibaba
  'qwen3-max':            { context:  262000, input:  0.78, output:  3.90, tokenizer: 'cl100k_base', provider: 'alibaba' },
  'qwen3.5-plus':         { context: 1000000, input:  0.26, output:  1.56, tokenizer: 'cl100k_base', provider: 'alibaba' },

  // Cohere
  'command-a':            { context:  256000, input:  2.50, output: 10.00, tokenizer: 'cl100k_base', provider: 'cohere' },
  'command-r-plus':       { context:  128000, input:  2.50, output: 10.00, tokenizer: 'cl100k_base', provider: 'cohere' },
  'command-r':            { context:  128000, input:  0.15, output:  0.60, tokenizer: 'cl100k_base', provider: 'cohere' },
  'command-r7b':          { context:  128000, input:  0.0375,output: 0.15, tokenizer: 'cl100k_base', provider: 'cohere' },
};

// Short aliases so `ctxstuff pack . --model claude` Just Works.
const MODEL_ALIASES = {
  'gpt':            'gpt-5.4',
  'openai':         'gpt-5.4',
  'gpt-5-turbo':    'gpt-5',          // legacy key from 2.x; now an alias
  'gpt-4.5-turbo':  'gpt-4.1',
  'claude':         'claude-sonnet-4-6',
  'claude-4-opus':  'claude-opus-4-6',
  'claude-4-sonnet':'claude-sonnet-4-6',
  'claude-4-haiku': 'claude-haiku-4-5',
  'claude-4.5-opus':'claude-opus-4-7',
  'claude-4.5-sonnet':'claude-sonnet-4-6',
  'claude-4.5-haiku':'claude-haiku-4-5',
  'claude-5':       'claude-opus-4-7',
  'opus':           'claude-opus-4-7',
  'sonnet':         'claude-sonnet-4-6',
  'haiku':          'claude-haiku-4-5',
  'gemini':         'gemini-3-flash',
  'gemini-pro':     'gemini-3.1-pro',
  'gemini-2.0-pro': 'gemini-2.5-pro',
  'gemini-2.0-flash':'gemini-2.5-flash',
  'llama':          'llama-4-maverick',
  'llama-4':        'llama-4-maverick',
  'llama-4-large':  'llama-4-maverick',
  'scout':          'llama-4-scout',
  'maverick':       'llama-4-maverick',
  'mistral':        'mistral-large-3',
  'mistral-large-2':'mistral-large-3',
  'mistral-medium-2':'mistral-medium-3',
  'magistral':      'magistral-medium',
  'grok':           'grok-4',
  'deepseek':       'deepseek-v3.2',
  'qwen':           'qwen3-max',
  'cohere':         'command-a',
  'command':        'command-a',
  'reasoning':      'o3',
};

// Default model for pack/count when user doesn't specify one.
const DEFAULT_MODEL = 'gpt-5.4';

// Legacy cross-promo constant kept as no-op so stale imports don't crash.
const CROSS_PROMO = {};

function resolveModel(name) {
  if (!name) return DEFAULT_MODEL;
  const k = String(name).toLowerCase();
  if (MODEL_PRICING[k]) return k;
  if (MODEL_ALIASES[k]) return MODEL_ALIASES[k];
  return DEFAULT_MODEL;
}

module.exports = {
  PRO_PRICE,
  PRO_URL,
  FREE_LIMITS,
  MODEL_PRICING,
  MODEL_ALIASES,
  DEFAULT_MODEL,
  CROSS_PROMO,
  resolveModel,
};

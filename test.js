// ctxstuff tests: core modules, price table and the command line
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { packDirectory } = require('./src/core/packer');
const { countTokens, estimateTokens, getModelInfo, calculateCost, listModels } = require('./src/core/tokenizer');
const { format } = require('./src/core/formatter');
const { splitContext, suggestSplit } = require('./src/core/splitter');
const { optimizeContext } = require('./src/core/optimizer');
const { MODEL_PRICING, MODEL_ALIASES, DEFAULT_MODEL, resolveModel } = require('./src/models');
const prices = require('./src/prices.json');

let passed = 0;
let failed = 0;

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => { console.log(`ok   ${name}`); passed++; })
    .catch((e) => { console.log(`FAIL ${name}\n     ${e.message}`); failed++; });
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctxstuff-test-'));
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src', 'a.js'), '// comment\nconst a = 1;\n\n\nmodule.exports = a;\n');
  fs.writeFileSync(path.join(dir, 'src', 'b.py'), 'def b():\n    return 2\n');
  fs.writeFileSync(path.join(dir, 'README.md'), '# Demo\n\nA tiny project.\n');
  fs.mkdirSync(path.join(dir, 'node_modules'));
  fs.writeFileSync(path.join(dir, 'node_modules', 'skip.js'), 'x');

  const packed = await packDirectory(dir, { includeTree: true, includeContent: true });

  await test('packDirectory finds files and skips node_modules', () => {
    assert(packed.files.length === 3, 'expected 3 files, got ' + packed.files.length);
    assert(!packed.files.some((f) => f.path.includes('node_modules')));
  });

  await test('extension filter works', async () => {
    const only = await packDirectory(dir, { extensions: ['py'], includeContent: true });
    assert(only.files.length === 1 && only.files[0].path.endsWith('b.py'));
  });

  await test('markdown, xml, plain and json formats render', () => {
    for (const f of ['markdown', 'xml', 'plain', 'json']) {
      const out = format(packed, f);
      assert(typeof out === 'string' && out.includes('a.js'), f + ' output missing file');
    }
  });

  await test('formatted output has no promo footer', () => {
    assert(!/voiddo/i.test(format(packed, 'markdown')));
  });

  await test('countTokens returns a positive number and 0 for empty text', () => {
    assert(countTokens('Hello, how are you today?').tokens > 0);
    assert(countTokens('').tokens === 0);
    assert(estimateTokens('abcdefgh') === 2);
  });

  await test('price table: every entry has dates, prices, and aliases resolve', () => {
    assert(prices.checked === '2026-11-26');
    for (const [k, m] of Object.entries(prices.models)) {
      assert(/^\d{4}-\d{2}-\d{2}$/.test(m.checked), k + ' needs a checked date');
      assert(typeof m.input === 'number' && typeof m.output === 'number', k + ' needs prices');
    }
    for (const [a, t] of Object.entries(MODEL_ALIASES)) assert(MODEL_PRICING[t], `alias ${a} -> ${t}`);
    assert(MODEL_PRICING[DEFAULT_MODEL], 'default model must exist');
    assert(resolveModel('opus') === 'claude-opus-5-5');
    assert(listModels().length === Object.keys(prices.models).length);
  });

  await test('calculateCost uses the table and handles unknown context', () => {
    const c = calculateCost(1_000_000, 0, 'claude-sonnet-5-5');
    assert(Math.abs(c.inputCost - 2) < 1e-9, 'expected $2, got ' + c.inputCost);
    assert(Math.abs(c.contextUsage - 1) < 1e-9, 'context usage should be 1');
    const n = calculateCost(1000, 0, 'claude-haiku-5-5');
    assert(n.contextUsage === null && n.contextRemaining === null);
    assert(calculateCost(1, 1, 'nope').error);
    assert(getModelInfo('nope').known === false);
  });

  await test('splitContext and suggestSplit work without any license', () => {
    const r = splitContext(packed, { strategy: 'by_files', maxFilesPerChunk: 2 });
    assert(!r.error && r.chunks.length === 2, 'expected 2 chunks');
    assert(suggestSplit(packed, 'grok-4.7').needsSplit === false);
  });

  await test('optimizeContext works and keeps files', () => {
    const r = optimizeContext(packed, { targetTokens: 100000 });
    assert(!r.error && r.files.length === 3);
  });

  const bin = path.join(__dirname, 'bin', 'ctxstuff.js');
  const run = (...args) => execFileSync('node', [bin, ...args], { encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });

  await test('--version prints the bare version', () => {
    assert(run('--version').trim() === require('./package.json').version);
  });

  await test('--help has no stale text', () => {
    const h = run('--help');
    assert(h.includes('Docs and issues: https://github.com/voidd0/ctxstuff'));
    assert(!/free\s+forever|voiddo\.com\/tools|\bPRO\b/i.test(h));
  });

  await test('count command runs and states how it counted', () => {
    const out = run('count', dir);
    assert(/Tokens:\s+[\d,]+ \((tiktoken cl100k_base|estimate, 1 token per 4 characters)\)/.test(out), out);
  });

  await test('count --models prints the price date', () => {
    const out = run('count', dir, '--models');
    assert(out.includes('2026-11-26') && out.includes('Prices as of 2026-11-26'));
  });

  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`\n${passed}/${passed + failed} tests passed`);
  if (failed > 0) process.exit(1);
}

main();

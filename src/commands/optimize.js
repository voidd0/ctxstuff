/**
 * Optimize command (PRO only)
 * @module commands/optimize
 *
 * Optimizes context to fit within token limits
 */

const path = require('path');
const fs = require('fs');
const { packDirectory } = require('../core/packer');
const { optimizeContext, getSuggestions } = require('../core/optimizer');
const { countFilesTokens, getModelInfo } = require('../core/tokenizer');
const { format } = require('../core/formatter');
const { isPro } = require('../license/checker');
const { canOperate, incrementOps } = require('../license/limits');
const { showProFeatureUpsell, maybeShowProTip } = require('../utils/upsell');
const { colors, success, error, warning, header, separator, formatBytes, formatNumber } = require('../utils/output');
const { DEFAULT_MODEL } = require('../license/constants');

/**
 * Execute optimize command
 * @param {string} directory - Directory to optimize
 * @param {Object} options - Command options
 */
async function execute(directory, options = {}) {
  // Check PRO status
  if (!isPro()) {
    showProFeatureUpsell('optimize', `
Context optimization automatically:
  • Removes comments and docstrings
  • Compresses whitespace
  • Truncates low-priority files
  • Fits context to any token limit

Perfect for large codebases that exceed context limits.
    `);
    process.exit(1);
  }

  const dir = path.resolve(directory || '.');

  if (!fs.existsSync(dir)) {
    error(`Directory not found: ${dir}`);
    process.exit(1);
  }

  // Check rate limit
  const opCheck = canOperate();
  if (!opCheck.allowed) {
    error(opCheck.reason);
    process.exit(1);
  }

  const model = options.model || DEFAULT_MODEL;
  const modelInfo = getModelInfo(model);
  const targetTokens = options.tokens
    ? parseInt(options.tokens)
    : (modelInfo.known ? Math.floor(modelInfo.context * 0.85) : null);

  if (!targetTokens) {
    error('Please specify --tokens or use a known model');
    process.exit(1);
  }

  // Pack directory first
  const packed = await packDirectory(dir, {
    extensions: options.ext ? options.ext.split(',') : null,
    ignore: options.ignore ? options.ignore.split(',') : [],
    includeTree: options.tree !== false,
    includeContent: true,
  });

  // Get initial stats
  const initialTokens = countFilesTokens(packed.files, model);

  header(`🔧 Optimizing: ${packed.directory}`);
  console.log('');
  console.log(`  ${colors.dim('Target:')}    ${formatNumber(targetTokens)} tokens (${model})`);
  console.log(`  ${colors.dim('Initial:')}   ${formatNumber(initialTokens.totalTokens)} tokens`);
  console.log(`  ${colors.dim('Files:')}     ${formatNumber(packed.files.length)}`);
  console.log('');

  // Optimize
  const optimized = optimizeContext(packed, {
    targetTokens,
    model,
    removeComments: options.keepComments !== true,
    removeEmptyLines: options.keepEmpty !== true,
    minify: options.minify === true,
  });

  if (optimized.error) {
    error(optimized.error);
    process.exit(1);
  }

  // Results
  const reduction = initialTokens.totalTokens - optimized.tokens;
  const reductionPct = ((reduction / initialTokens.totalTokens) * 100).toFixed(1);

  console.log(colors.success('✓ Optimization complete'));
  console.log('');
  console.log(`  ${colors.dim('Final:')}     ${formatNumber(optimized.tokens)} tokens`);
  console.log(`  ${colors.dim('Reduced:')}   ${formatNumber(reduction)} tokens (${reductionPct}%)`);
  console.log(`  ${colors.dim('Files:')}     ${formatNumber(optimized.files.length)}`);

  if (optimized.droppedFiles && optimized.droppedFiles.length > 0) {
    console.log('');
    warning(`${optimized.droppedFiles.length} files dropped to fit limit:`);
    optimized.droppedFiles.slice(0, 5).forEach(f => {
      console.log(`    - ${f}`);
    });
    if (optimized.droppedFiles.length > 5) {
      console.log(`    ... and ${optimized.droppedFiles.length - 5} more`);
    }
  }

  // Strategies used
  const strategiesUsed = new Set();
  optimized.files.forEach(f => {
    if (f.strategies) f.strategies.forEach(s => strategiesUsed.add(s));
  });

  if (strategiesUsed.size > 0) {
    console.log('');
    console.log(`  ${colors.dim('Strategies:')} ${Array.from(strategiesUsed).join(', ')}`);
  }

  // Increment operation count
  incrementOps();

  // Output
  if (options.output) {
    const outputFormat = options.format || 'markdown';
    const formatted = format(optimized, outputFormat);
    fs.writeFileSync(options.output, formatted);
    console.log('');
    success(`Optimized context written to ${options.output}`);
  } else if (!options.quiet) {
    console.log('');
    separator();
    console.log('');
    console.log(colors.dim('Use --output <file> to save optimized context'));
  }

  // Show tip
  maybeShowProTip('optimize');
}

module.exports = { execute };

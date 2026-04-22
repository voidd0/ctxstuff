/**
 * Compare command
 * @module commands/compare
 *
 * Compare token counts across models
 */

const path = require('path');
const fs = require('fs');
const { packDirectory } = require('../core/packer');
const { countFilesTokens, getModelInfo, listModels } = require('../core/tokenizer');
const { canOperate, incrementOps } = require('../license/limits');
const { isPro } = require('../license/checker');
const { maybeShowProTip } = require('../utils/upsell');
const { colors, error, header, separator, formatBytes, formatNumber, table } = require('../utils/output');
const { MODEL_PRICING, DEFAULT_MODEL } = require('../license/constants');

/**
 * Execute compare command
 * @param {string} target - File or directory
 * @param {Object} options - Command options
 */
async function execute(target, options = {}) {
  const targetPath = path.resolve(target || '.');

  if (!fs.existsSync(targetPath)) {
    error(`Path not found: ${targetPath}`);
    process.exit(1);
  }

  // Check rate limit
  const opCheck = canOperate();
  if (!opCheck.allowed) {
    error(opCheck.reason);
    process.exit(1);
  }

  // Get content
  let files = [];
  let totalSize = 0;
  let name = '';

  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    const content = fs.readFileSync(targetPath, 'utf-8');
    files = [{ path: targetPath, content, size: stat.size }];
    totalSize = stat.size;
    name = path.basename(targetPath);
  } else {
    const packed = await packDirectory(targetPath, {
      extensions: options.ext ? options.ext.split(',') : null,
      ignore: options.ignore ? options.ignore.split(',') : [],
      includeTree: false,
      includeContent: true,
    });
    files = packed.files;
    totalSize = packed.totalSize;
    name = packed.directory;
  }

  // Increment operation count
  incrementOps();

  // Compare models
  header(`📊 Model Comparison: ${name}`);
  console.log('');
  console.log(`  ${colors.dim('Files:')}  ${formatNumber(files.length)}`);
  console.log(`  ${colors.dim('Size:')}   ${formatBytes(totalSize)}`);
  console.log('');

  const models = options.models
    ? options.models.split(',')
    : Object.keys(MODEL_PRICING);

  const comparisons = [];

  for (const model of models) {
    const modelInfo = getModelInfo(model);
    if (!modelInfo.known) continue;

    const tokenResult = countFilesTokens(files, model);
    const usage = tokenResult.totalTokens / modelInfo.context;
    const fits = usage <= 1;
    const remaining = modelInfo.context - tokenResult.totalTokens;

    comparisons.push({
      model,
      tokens: tokenResult.totalTokens,
      accurate: tokenResult.accurate,
      context: modelInfo.context,
      usage: usage,
      fits,
      remaining,
    });
  }

  // Sort by context usage (ascending)
  comparisons.sort((a, b) => a.usage - b.usage);

  // Display
  const headers = ['Model', 'Tokens', 'Context', 'Usage', 'Fits'];
  const rows = comparisons.map(c => {
    const usageStr = `${(c.usage * 100).toFixed(1)}%`;
    const usageColor = c.usage > 1 ? colors.error : (c.usage > 0.8 ? colors.warning : colors.success);

    return [
      c.model,
      formatNumber(c.tokens) + (c.accurate ? '' : '*'),
      formatNumber(c.context),
      usageColor(usageStr),
      c.fits ? colors.success('✓') : colors.error('✗'),
    ];
  });

  table(headers, rows);

  if (!isPro()) {
    console.log('');
    console.log(colors.dim('* = estimated tokens (PRO has accurate tiktoken counting)'));
  }

  // Summary
  console.log('');
  separator();
  console.log('');

  const fittingModels = comparisons.filter(c => c.fits);
  const notFitting = comparisons.filter(c => !c.fits);

  if (fittingModels.length > 0) {
    console.log(colors.success(`✓ Fits in ${fittingModels.length} model(s):`));
    fittingModels.slice(0, 5).forEach(c => {
      console.log(`  - ${c.model} (${formatNumber(c.remaining)} tokens remaining)`);
    });
  }

  if (notFitting.length > 0) {
    console.log('');
    console.log(colors.warning(`✗ Exceeds ${notFitting.length} model(s):`));
    notFitting.slice(0, 3).forEach(c => {
      const overflow = c.tokens - c.context;
      console.log(`  - ${c.model} (${formatNumber(overflow)} tokens over)`);
    });

    if (!isPro()) {
      console.log('');
      console.log(colors.dim(`${colors.pro('PRO')} can optimize or split to fit any model`));
    }
  }

  // Maybe show PRO tip
  maybeShowProTip('compare');
}

module.exports = { execute };

/**
 * Count command
 * @module commands/count
 *
 * Count tokens in files or directories
 */

const path = require('path');
const fs = require('fs');
const { packDirectory } = require('../core/packer');
const { countTokens, countFilesTokens, getModelInfo, listModels } = require('../core/tokenizer');
const { canOperate, incrementOps } = require('../license/limits');
const { isPro } = require('../license/checker');
const { maybeShowProTip, showLimitExceeded } = require('../utils/upsell');
const { colors, success, error, header, separator, formatBytes, formatNumber, table } = require('../utils/output');
const { DEFAULT_MODEL, MODEL_PRICING } = require('../license/constants');

/**
 * Execute count command
 * @param {string} target - File or directory to count
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
    showLimitExceeded('operations', opCheck.reason);
    process.exit(1);
  }

  const model = options.model || DEFAULT_MODEL;
  const modelInfo = getModelInfo(model);

  if (options.models) {
    // List available models
    printModelList();
    return;
  }

  const stat = fs.statSync(targetPath);

  if (stat.isFile()) {
    // Count single file
    countSingleFile(targetPath, model, options);
  } else {
    // Count directory
    await countDirectory(targetPath, model, options);
  }

  // Increment operation count
  incrementOps();

  // Maybe show PRO tip
  maybeShowProTip('count');
}

/**
 * Count tokens in a single file
 */
function countSingleFile(filePath, model, options) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const result = countTokens(content, model);
    const stat = fs.statSync(filePath);
    const modelInfo = getModelInfo(model);

    header(`📊 Token Count: ${path.basename(filePath)}`);
    console.log('');

    console.log(`  ${colors.dim('File:')}     ${filePath}`);
    console.log(`  ${colors.dim('Size:')}     ${formatBytes(stat.size)}`);
    console.log(`  ${colors.dim('Model:')}    ${model}`);

    const tokenLabel = result.accurate ? 'Tokens:' : 'Tokens:';
    const tokenNote = result.accurate ? colors.dim(' (accurate)') : colors.dim(' (estimate)');
    console.log(`  ${colors.dim(tokenLabel)}   ${formatNumber(result.tokens)}${tokenNote}`);

    if (!result.accurate) {
      console.log(`  ${colors.dim('')}          ${colors.pro('PRO')} has accurate tiktoken counting`);
    }

    if (modelInfo.known) {
      const usage = (result.tokens / modelInfo.context * 100).toFixed(1);
      const remaining = modelInfo.context - result.tokens;
      console.log('');
      console.log(`  ${colors.dim('Context:')}  ${formatNumber(modelInfo.context)} tokens (${model})`);
      console.log(`  ${colors.dim('Usage:')}    ${usage}%`);
      console.log(`  ${colors.dim('Remaining:')} ${formatNumber(remaining)} tokens`);
    }

    if (options.breakdown && result.tokens > 0) {
      console.log('');
      separator();
      console.log('');
      printBreakdown(content, model);
    }
  } catch (e) {
    error(`Failed to read file: ${e.message}`);
    process.exit(1);
  }
}

/**
 * Count tokens in a directory
 */
async function countDirectory(dir, model, options) {
  const packed = await packDirectory(dir, {
    extensions: options.ext ? options.ext.split(',') : null,
    ignore: options.ignore ? options.ignore.split(',') : [],
    includeTree: false,
    includeContent: true,
  });

  const result = countFilesTokens(packed.files, model);
  const modelInfo = getModelInfo(model);

  header(`📊 Token Count: ${packed.directory}`);
  console.log('');

  console.log(`  ${colors.dim('Files:')}    ${formatNumber(packed.totalFiles)}`);
  console.log(`  ${colors.dim('Size:')}     ${formatBytes(packed.totalSize)}`);
  console.log(`  ${colors.dim('Model:')}    ${model}`);

  const tokenNote = result.accurate ? colors.dim(' (accurate)') : colors.dim(' (estimate)');
  console.log(`  ${colors.dim('Tokens:')}   ${formatNumber(result.totalTokens)}${tokenNote}`);

  if (!result.accurate) {
    console.log(`  ${colors.dim('')}          ${colors.pro('PRO')} has accurate tiktoken counting`);
  }

  if (modelInfo.known) {
    const usage = (result.totalTokens / modelInfo.context * 100).toFixed(1);
    const remaining = modelInfo.context - result.totalTokens;
    const fitsContext = result.totalTokens <= modelInfo.context;

    console.log('');
    console.log(`  ${colors.dim('Context:')}  ${formatNumber(modelInfo.context)} tokens (${model})`);
    console.log(`  ${colors.dim('Usage:')}    ${usage}%`);

    if (fitsContext) {
      console.log(`  ${colors.dim('Remaining:')} ${formatNumber(remaining)} tokens`);
      console.log(`  ${colors.success('✓')} Fits within context window`);
    } else {
      console.log(`  ${colors.dim('Overflow:')} ${formatNumber(-remaining)} tokens over`);
      console.log(`  ${colors.error('✗')} Exceeds context window`);
      console.log(`  ${colors.dim('')}    ${colors.pro('PRO')} can optimize or split to fit`);
    }
  }

  if (options.breakdown) {
    console.log('');
    separator();
    console.log('');
    console.log(colors.bold('Files by token count:'));
    console.log('');

    const sortedFiles = [...result.fileTokens]
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 20);

    sortedFiles.forEach((file, i) => {
      const pct = ((file.tokens / result.totalTokens) * 100).toFixed(1);
      console.log(`  ${String(i + 1).padStart(2)}. ${colors.accent(file.path)}`);
      console.log(`      ${formatNumber(file.tokens)} tokens (${pct}%)`);
    });

    if (result.fileTokens.length > 20) {
      console.log(`  ... and ${result.fileTokens.length - 20} more files`);
    }
  }
}

/**
 * Print content breakdown
 */
function printBreakdown(content, model) {
  const lines = content.split('\n');
  const codeLines = lines.filter(l => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('#'));
  const commentLines = lines.filter(l => l.trim().startsWith('//') || l.trim().startsWith('#'));
  const emptyLines = lines.filter(l => !l.trim());

  console.log(colors.bold('Content breakdown:'));
  console.log(`  Code lines:      ${formatNumber(codeLines.length)}`);
  console.log(`  Comment lines:   ${formatNumber(commentLines.length)}`);
  console.log(`  Empty lines:     ${formatNumber(emptyLines.length)}`);
  console.log(`  Total lines:     ${formatNumber(lines.length)}`);
}

/**
 * Print model list
 */
function printModelList() {
  header('📋 Supported Models');
  console.log('');

  const models = listModels();

  const headers = ['Model', 'Context', 'Input $/1M', 'Output $/1M'];
  const rows = models.map(m => [
    m.name,
    formatNumber(m.context),
    m.inputPrice > 0 ? `$${m.inputPrice.toFixed(2)}` : 'free',
    m.outputPrice > 0 ? `$${m.outputPrice.toFixed(2)}` : 'free',
  ]);

  table(headers, rows);

  console.log('');
  console.log(colors.dim('Use --model <name> to select a model'));
  if (!isPro()) {
    console.log(colors.dim(`${colors.pro('PRO')} has custom model profiles with up-to-date pricing`));
  }
}

module.exports = { execute };

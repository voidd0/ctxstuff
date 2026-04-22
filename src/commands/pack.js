/**
 * Pack command
 * @module commands/pack
 *
 * Packs a directory into LLM-ready context
 */

const path = require('path');
const fs = require('fs');
const { packDirectory } = require('../core/packer');
const { countFilesTokens } = require('../core/tokenizer');
const { format, FORMATS } = require('../core/formatter');
const { canOperate, incrementOps, checkFileLimit, checkSizeLimit } = require('../license/limits');
const { isPro } = require('../license/checker');
const { maybeShowProTip, showLimitExceeded } = require('../utils/upsell');
const { colors, success, error, warning, info, header, separator, formatBytes, formatNumber } = require('../utils/output');
const { DEFAULT_MODEL } = require('../license/constants');

/**
 * Execute pack command
 * @param {string} directory - Directory to pack
 * @param {Object} options - Command options
 */
async function execute(directory, options = {}) {
  const dir = path.resolve(directory || '.');

  if (!fs.existsSync(dir)) {
    error(`Directory not found: ${dir}`);
    process.exit(1);
  }

  if (!fs.statSync(dir).isDirectory()) {
    error(`Not a directory: ${dir}`);
    process.exit(1);
  }

  // Check rate limit
  const opCheck = canOperate();
  if (!opCheck.allowed) {
    showLimitExceeded('operations', opCheck.reason);
    process.exit(1);
  }

  // Pack directory
  const packed = await packDirectory(dir, {
    extensions: options.ext ? options.ext.split(',') : null,
    ignore: options.ignore ? options.ignore.split(',') : [],
    maxFileSize: options.maxFileSize ? parseInt(options.maxFileSize) * 1024 : undefined,
    includeTree: options.tree !== false,
    includeContent: true,
  });

  // Check file limit
  const fileCheck = checkFileLimit(packed.files.length);
  if (!fileCheck.allowed) {
    showLimitExceeded('files', fileCheck.reason);
    if (!isPro()) {
      packed.files = packed.files.slice(0, fileCheck.count);
      packed.totalFiles = packed.files.length;
      packed.truncated = true;
      warning(`Truncated to ${fileCheck.count} files`);
    }
  }

  // Check size limit
  const sizeCheck = checkSizeLimit(packed.totalSize);
  if (!sizeCheck.allowed) {
    showLimitExceeded('size', sizeCheck.reason);
    if (!isPro()) {
      // Truncate files to fit size limit
      let currentSize = 0;
      const limitedFiles = [];
      for (const file of packed.files) {
        if (currentSize + file.size <= sizeCheck.size) {
          limitedFiles.push(file);
          currentSize += file.size;
        } else {
          break;
        }
      }
      packed.files = limitedFiles;
      packed.totalFiles = packed.files.length;
      packed.totalSize = currentSize;
      packed.truncated = true;
    }
  }

  // Count tokens
  const model = options.model || DEFAULT_MODEL;
  const tokenResult = countFilesTokens(packed.files, model);
  packed.tokens = tokenResult.totalTokens;
  packed.tokensAccurate = tokenResult.accurate;

  // Increment operation count
  incrementOps();

  // Output based on options
  if (options.output) {
    // Write to file
    const outputFormat = options.format || 'markdown';
    const formatted = format(packed, outputFormat, {
      includeTree: options.tree !== false,
      includeStats: true,
    });

    fs.writeFileSync(options.output, formatted);
    success(`Packed context written to ${options.output}`);
  } else if (options.clipboard) {
    // Copy to clipboard
    const outputFormat = options.format || 'markdown';
    const formatted = format(packed, outputFormat);

    try {
      const { execSync } = require('child_process');
      const platform = process.platform;

      if (platform === 'darwin') {
        execSync('pbcopy', { input: formatted });
      } else if (platform === 'linux') {
        try {
          execSync('xclip -selection clipboard', { input: formatted });
        } catch {
          execSync('xsel --clipboard --input', { input: formatted });
        }
      } else if (platform === 'win32') {
        execSync('clip', { input: formatted });
      }

      success('Copied to clipboard!');
    } catch (e) {
      error('Failed to copy to clipboard: ' + e.message);
      // Fall back to stdout
      console.log(formatted);
    }
  } else if (options.quiet) {
    // Just output the formatted content
    const outputFormat = options.format || 'markdown';
    const formatted = format(packed, outputFormat);
    console.log(formatted);
  } else {
    // Show summary and output
    printSummary(packed, model, options);

    if (options.format || !options.stats) {
      console.log('');
      separator();
      console.log('');
      const outputFormat = options.format || 'markdown';
      const formatted = format(packed, outputFormat);
      console.log(formatted);
    }
  }

  // Maybe show PRO tip
  maybeShowProTip('pack');
}

/**
 * Print pack summary
 * @param {Object} packed - Packed result
 * @param {string} model - Model name
 * @param {Object} options - Options
 */
function printSummary(packed, model, options) {
  header(`📦 Packed: ${packed.directory}`);
  console.log('');

  console.log(`  ${colors.dim('Files:')}     ${formatNumber(packed.totalFiles)}`);
  console.log(`  ${colors.dim('Size:')}      ${formatBytes(packed.totalSize)}`);

  const tokenLabel = packed.tokensAccurate ? 'Tokens:' : 'Tokens:';
  const tokenNote = packed.tokensAccurate ? '' : colors.dim(' (estimate)');
  console.log(`  ${colors.dim(tokenLabel)}    ~${formatNumber(packed.tokens)}${tokenNote}`);

  if (!packed.tokensAccurate && !isPro()) {
    console.log(`  ${colors.dim('')}          ${colors.pro('PRO')} has accurate token counting`);
  }

  if (packed.truncated) {
    console.log('');
    warning('Output was truncated due to FREE tier limits');
  }

  if (options.stats) {
    console.log('');
    separator();
    console.log('');
    console.log(colors.bold('Top files by size:'));

    const topFiles = [...packed.files]
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);

    topFiles.forEach((file, i) => {
      const tokens = Math.ceil(file.size / 4);
      console.log(`  ${i + 1}. ${colors.accent(file.path)} (${formatBytes(file.size)}, ~${formatNumber(tokens)} tokens)`);
    });
  }
}

module.exports = { execute };

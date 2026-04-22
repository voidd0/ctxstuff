/**
 * Watch command (PRO only)
 * @module commands/watch
 *
 * Watches files and repacks on changes
 */

const path = require('path');
const fs = require('fs');
const { packDirectory } = require('../core/packer');
const { countFilesTokens } = require('../core/tokenizer');
const { format } = require('../core/formatter');
const { isPro } = require('../license/checker');
const { showProFeatureUpsell } = require('../utils/upsell');
const { colors, success, error, info, header, separator, formatBytes, formatNumber } = require('../utils/output');
const { DEFAULT_MODEL } = require('../license/constants');

let chokidar = null;

/**
 * Execute watch command
 * @param {string} directory - Directory to watch
 * @param {Object} options - Command options
 */
async function execute(directory, options = {}) {
  // Check PRO status
  if (!isPro()) {
    showProFeatureUpsell('watch', `
File watching automatically:
  • Repacks context when files change
  • Updates output file in real-time
  • Copies to clipboard on change
  • Shows token count updates

Perfect for iterating while using LLMs.
    `);
    process.exit(1);
  }

  // Lazy load chokidar
  try {
    chokidar = require('chokidar');
  } catch (e) {
    error('chokidar is required for watch mode. Install with: npm install chokidar');
    process.exit(1);
  }

  const dir = path.resolve(directory || '.');

  if (!fs.existsSync(dir)) {
    error(`Directory not found: ${dir}`);
    process.exit(1);
  }

  const model = options.model || DEFAULT_MODEL;
  const outputFile = options.output ? path.resolve(options.output) : null;
  const outputFormat = options.format || 'markdown';

  header(`👁️ Watching: ${path.basename(dir)}`);
  console.log('');
  console.log(`  ${colors.dim('Directory:')} ${dir}`);
  console.log(`  ${colors.dim('Model:')}     ${model}`);
  console.log(`  ${colors.dim('Format:')}    ${outputFormat}`);
  if (outputFile) {
    console.log(`  ${colors.dim('Output:')}    ${outputFile}`);
  }
  console.log('');
  separator();
  console.log('');

  // Initial pack
  await packAndOutput(dir, { model, outputFile, outputFormat, options });

  // Set up watcher
  const ignorePatterns = [
    /(^|[\/\\])\../, // dotfiles
    /node_modules/,
    /\.git/,
    /dist/,
    /build/,
  ];

  if (outputFile) {
    ignorePatterns.push(new RegExp(path.basename(outputFile).replace(/\./g, '\\.')));
  }

  const watcher = chokidar.watch(dir, {
    ignored: ignorePatterns,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
  });

  let debounceTimer = null;
  const debounceMs = options.debounce ? parseInt(options.debounce) : 1000;

  const handleChange = (eventType, filepath) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      console.log('');
      info(`${eventType}: ${path.relative(dir, filepath)}`);
      await packAndOutput(dir, { model, outputFile, outputFormat, options });
    }, debounceMs);
  };

  watcher
    .on('add', filepath => handleChange('Added', filepath))
    .on('change', filepath => handleChange('Changed', filepath))
    .on('unlink', filepath => handleChange('Removed', filepath));

  console.log(colors.dim('Watching for changes... (Ctrl+C to stop)'));
  console.log('');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('');
    console.log(colors.dim('Stopping watcher...'));
    watcher.close();
    process.exit(0);
  });
}

/**
 * Pack directory and output
 */
async function packAndOutput(dir, { model, outputFile, outputFormat, options }) {
  try {
    const packed = await packDirectory(dir, {
      extensions: options.ext ? options.ext.split(',') : null,
      ignore: options.ignore ? options.ignore.split(',') : [],
      includeTree: options.tree !== false,
      includeContent: true,
    });

    const tokenResult = countFilesTokens(packed.files, model);
    packed.tokens = tokenResult.totalTokens;

    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${colors.dim(timestamp)}] ${colors.success('✓')} Packed: ${formatNumber(packed.totalFiles)} files, ~${formatNumber(packed.tokens)} tokens`);

    if (outputFile) {
      const formatted = format(packed, outputFormat);
      fs.writeFileSync(outputFile, formatted);
      console.log(`             ${colors.dim('→')} Written to ${path.basename(outputFile)}`);
    }

    if (options.clipboard) {
      const formatted = format(packed, outputFormat);
      copyToClipboard(formatted);
      console.log(`             ${colors.dim('→')} Copied to clipboard`);
    }

  } catch (e) {
    error(`Pack failed: ${e.message}`);
  }
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
  try {
    const { execSync } = require('child_process');
    const platform = process.platform;

    if (platform === 'darwin') {
      execSync('pbcopy', { input: text });
    } else if (platform === 'linux') {
      try {
        execSync('xclip -selection clipboard', { input: text });
      } catch {
        execSync('xsel --clipboard --input', { input: text });
      }
    } else if (platform === 'win32') {
      execSync('clip', { input: text });
    }
  } catch (e) {
    // Ignore clipboard errors
  }
}

module.exports = { execute };

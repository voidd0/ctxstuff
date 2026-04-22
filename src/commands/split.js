/**
 * Split command (PRO only)
 * @module commands/split
 *
 * Splits large codebases into manageable chunks
 */

const path = require('path');
const fs = require('fs');
const { packDirectory } = require('../core/packer');
const { splitContext, suggestSplit, SPLIT_STRATEGIES } = require('../core/splitter');
const { format } = require('../core/formatter');
const { isPro } = require('../license/checker');
const { canOperate, incrementOps } = require('../license/limits');
const { showProFeatureUpsell, maybeShowProTip } = require('../utils/upsell');
const { colors, success, error, header, separator, formatBytes, formatNumber, table } = require('../utils/output');
const { DEFAULT_MODEL } = require('../license/constants');

/**
 * Execute split command
 * @param {string} directory - Directory to split
 * @param {Object} options - Command options
 */
async function execute(directory, options = {}) {
  // Check PRO status
  if (!isPro()) {
    showProFeatureUpsell('split', `
Context splitting automatically:
  • Divides large codebases into chunks
  • Respects model context limits
  • Groups by directory, type, or tokens
  • Optional overlap for continuity

Perfect for codebases that don't fit in a single context window.
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
  const strategy = options.strategy || 'by_tokens';

  // Pack directory first
  const packed = await packDirectory(dir, {
    extensions: options.ext ? options.ext.split(',') : null,
    ignore: options.ignore ? options.ignore.split(',') : [],
    includeTree: true,
    includeContent: true,
  });

  // Get suggestions first if --suggest
  if (options.suggest) {
    const suggestion = suggestSplit(packed, model);
    printSuggestion(suggestion, packed, model);
    incrementOps();
    return;
  }

  header(`✂️ Splitting: ${packed.directory}`);
  console.log('');
  console.log(`  ${colors.dim('Strategy:')}  ${strategy}`);
  console.log(`  ${colors.dim('Model:')}     ${model}`);
  console.log(`  ${colors.dim('Files:')}     ${formatNumber(packed.files.length)}`);
  console.log('');

  // Split
  const result = splitContext(packed, {
    strategy,
    model,
    maxTokensPerChunk: options.maxTokens ? parseInt(options.maxTokens) : null,
    maxFilesPerChunk: options.maxFiles ? parseInt(options.maxFiles) : null,
    overlap: options.overlap === true,
    overlapFiles: options.overlapFiles ? parseInt(options.overlapFiles) : 2,
  });

  if (result.error) {
    error(result.error);
    process.exit(1);
  }

  // Print results
  console.log(colors.success(`✓ Split into ${result.totalChunks} chunks`));
  console.log('');

  const headers = ['Chunk', 'Files', 'Tokens', 'Size'];
  const rows = result.chunks.map(chunk => [
    `#${chunk.index}`,
    chunk.files.length,
    formatNumber(chunk.tokens),
    formatBytes(chunk.size),
  ]);

  table(headers, rows);

  console.log('');
  console.log(`  ${colors.dim('Avg tokens:')}  ${formatNumber(result.stats.avgTokensPerChunk)}`);
  console.log(`  ${colors.dim('Max tokens:')}  ${formatNumber(result.stats.maxTokensInChunk)}`);
  console.log(`  ${colors.dim('Min tokens:')}  ${formatNumber(result.stats.minTokensInChunk)}`);

  // Increment operation count
  incrementOps();

  // Output chunks
  if (options.output) {
    const outputDir = path.resolve(options.output);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFormat = options.format || 'markdown';
    const ext = outputFormat === 'json' ? 'json' : (outputFormat === 'xml' ? 'xml' : 'md');

    for (const chunk of result.chunks) {
      const chunkData = {
        directory: packed.directory,
        tree: packed.tree,
        files: chunk.files,
        totalFiles: chunk.files.length,
        totalSize: chunk.size,
        tokens: chunk.tokens,
        chunk: chunk.index,
        totalChunks: result.totalChunks,
      };

      const formatted = format(chunkData, outputFormat);
      const filename = `chunk-${String(chunk.index).padStart(2, '0')}.${ext}`;
      fs.writeFileSync(path.join(outputDir, filename), formatted);
    }

    console.log('');
    success(`Chunks written to ${outputDir}/`);
  } else if (options.list) {
    console.log('');
    separator();
    console.log('');

    for (const chunk of result.chunks) {
      console.log(colors.bold(`Chunk #${chunk.index}`) + ` (${formatNumber(chunk.tokens)} tokens)`);
      chunk.filePaths.slice(0, 10).forEach(p => {
        console.log(`  - ${p}`);
      });
      if (chunk.filePaths.length > 10) {
        console.log(`  ... and ${chunk.filePaths.length - 10} more`);
      }
      console.log('');
    }
  }

  // Show tip
  maybeShowProTip('split');
}

/**
 * Print split suggestion
 */
function printSuggestion(suggestion, packed, model) {
  header(`📊 Split Analysis: ${packed.directory}`);
  console.log('');

  console.log(`  ${colors.dim('Files:')}     ${formatNumber(packed.files.length)}`);
  console.log(`  ${colors.dim('Tokens:')}    ${formatNumber(suggestion.tokens)}`);
  console.log(`  ${colors.dim('Model:')}     ${model}`);

  if (suggestion.contextLimit) {
    console.log(`  ${colors.dim('Context:')}   ${formatNumber(suggestion.contextLimit)} tokens`);
  }

  console.log('');

  if (suggestion.needsSplit) {
    console.log(colors.warning(`⚠ ${suggestion.recommendation}`));
    console.log('');
    console.log(colors.bold('Available strategies:'));
    suggestion.strategies.forEach(s => {
      console.log(`  ${colors.accent(s.strategy)} - ${s.desc}`);
    });
    console.log('');
    console.log(colors.dim('Run: ctxstuff split <dir> --strategy <name>'));
  } else {
    console.log(colors.success('✓ ' + suggestion.recommendation));
    console.log(`  Context usage: ${(suggestion.contextUsage * 100).toFixed(1)}%`);
  }
}

module.exports = { execute };

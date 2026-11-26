/**
 * Cost command
 * @module commands/cost
 *
 * Estimates API costs for context
 */

const path = require('path');
const fs = require('fs');
const { packDirectory } = require('../core/packer');
const { countFilesTokens, calculateCost, listModels, getModelInfo } = require('../core/tokenizer');
const { colors, success, error, header, separator, formatBytes, formatNumber, formatMoney, table } = require('../utils/output');
const { MODEL_PRICING, PRICES_CHECKED } = require('../models');

function PRICES_CHECKED_FOR(model) {
  return MODEL_PRICING[model].checked;
}

/**
 * Execute cost command
 * @param {string} target - File or directory
 * @param {Object} options - Command options
 */
async function execute(target, options = {}) {
  const targetPath = path.resolve(target || '.');

  if (!fs.existsSync(targetPath)) {
    error(`Path not found: ${targetPath}`);
    process.exit(1);
  }

  const model = options.model || null;
  const outputTokens = options.output ? parseInt(options.output) : 1000;

  // Get content
  let files = [];
  let totalSize = 0;

  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    const content = fs.readFileSync(targetPath, 'utf-8');
    files = [{ path: targetPath, content, size: stat.size }];
    totalSize = stat.size;
  } else {
    const packed = await packDirectory(targetPath, {
      extensions: options.ext ? options.ext.split(',') : null,
      ignore: options.ignore ? options.ignore.split(',') : [],
      includeTree: false,
      includeContent: true,
    });
    files = packed.files;
    totalSize = packed.totalSize;
  }

  if (options.compare || !model) {
    // Compare all models
    printCostComparison(files, outputTokens);
  } else {
    // Single model cost
    printSingleCost(files, model, outputTokens);
  }
}

/**
 * Print cost for a single model
 */
function printSingleCost(files, model, outputTokens) {
  const tokenResult = countFilesTokens(files, model);
  const cost = calculateCost(tokenResult.totalTokens, outputTokens, model);

  if (cost.error) {
    error(cost.error);
    process.exit(1);
  }

  header(`Cost estimate: ${model}`);
  console.log('');

  console.log(`  ${colors.dim('Input tokens:')}   ${formatNumber(tokenResult.totalTokens)}`);
  console.log(`  ${colors.dim('Output tokens:')}  ${formatNumber(outputTokens)} (estimated)`);
  console.log('');

  console.log(`  ${colors.dim('Input cost:')}     ${formatMoney(cost.inputCost)}`);
  console.log(`  ${colors.dim('Output cost:')}    ${formatMoney(cost.outputCost)}`);
  console.log(`  ${colors.bold('Total cost:')}     ${colors.price(formatMoney(cost.totalCost))}`);

  console.log('');
  const info = getModelInfo(model);
  if (cost.contextUsage === null) {
    console.log(`  ${colors.dim('Context:')}       not stated on the provider pricing page`);
  } else {
    console.log(`  ${colors.dim('Context usage:')} ${(cost.contextUsage * 100).toFixed(1)}%`);
    console.log(`  ${colors.dim('Remaining:')}     ${formatNumber(cost.contextRemaining)} tokens`);
  }
  console.log(`  ${colors.dim('Price date:')}    ${info.checked}`);

  if (cost.contextUsage !== null && cost.contextUsage > 1) {
    console.log('');
    console.log(colors.error('! Context limit exceeded! Use optimize or split.'));
  }
}

/**
 * Print cost comparison across models
 */
function printCostComparison(files, outputTokens) {
  header('Cost comparison');
  console.log('');

  // Token counts are the same for every model: one tokenizer or estimate is used
  const models = Object.keys(MODEL_PRICING);
  const costs = [];

  for (const model of models) {
    const tokenResult = countFilesTokens(files, model);
    const cost = calculateCost(tokenResult.totalTokens, outputTokens, model);

    if (!cost.error) {
      costs.push({
        model,
        inputTokens: tokenResult.totalTokens,
        inputCost: cost.inputCost,
        outputCost: cost.outputCost,
        totalCost: cost.totalCost,
        contextUsage: cost.contextUsage,
        fits: cost.contextUsage === null ? null : cost.contextUsage <= 1,
        checked: PRICES_CHECKED_FOR(model),
      });
    }
  }

  // Sort by total cost
  costs.sort((a, b) => a.totalCost - b.totalCost);

  // Display comparison
  const headers = ['Model', 'Tokens', 'Input $', 'Output $', 'Total $', 'Fits', 'Price date'];
  const rows = costs.map(c => [
    c.model,
    formatNumber(c.inputTokens),
    formatMoney(c.inputCost),
    formatMoney(c.outputCost),
    formatMoney(c.totalCost),
    c.fits === null ? colors.dim('?') : (c.fits ? colors.success('✓') : colors.error('✗')),
    c.checked,
  ]);

  table(headers, rows);

  console.log('');
  console.log(colors.dim(`Estimated output: ${formatNumber(outputTokens)} tokens`));
  console.log(colors.dim('Use --output <tokens> to change output estimate'));
  console.log(colors.dim(`Prices as of ${PRICES_CHECKED}; rows with an older Price date were not re-read from the provider page.`));
  console.log(colors.dim('Token counts: tiktoken cl100k_base if installed, else 1 token per 4 characters. Same count for every model.'));

  // Recommendation
  const bestFit = costs.find(c => c.fits === true);
  const cheapest = costs[0];

  console.log('');
  separator();
  console.log('');

  if (bestFit) {
    console.log(colors.success('Recommendation:'));
    console.log(`   Best value: ${colors.bold(bestFit.model)} at ${colors.price(formatMoney(bestFit.totalCost))}`);

    if (cheapest.model !== bestFit.model) {
      console.log(`   Cheapest (may not fit): ${cheapest.model} at ${formatMoney(cheapest.totalCost)}`);
    }
  } else {
    console.log(colors.warning('! Content exceeds all model context limits'));
    console.log('   Use optimize or split commands to fit within limits');
  }
}

module.exports = { execute };

/**
 * Cost command (PRO only)
 * @module commands/cost
 *
 * Estimates API costs for context
 */

const path = require('path');
const fs = require('fs');
const { packDirectory } = require('../core/packer');
const { countFilesTokens, calculateCost, listModels, getModelInfo } = require('../core/tokenizer');
const { isPro } = require('../license/checker');
const { canOperate, incrementOps } = require('../license/limits');
const { showProFeatureUpsell, maybeShowProTip } = require('../utils/upsell');
const { colors, success, error, header, separator, formatBytes, formatNumber, formatMoney, table } = require('../utils/output');
const { DEFAULT_MODEL, MODEL_PRICING } = require('../license/constants');

/**
 * Execute cost command
 * @param {string} target - File or directory
 * @param {Object} options - Command options
 */
async function execute(target, options = {}) {
  // Check PRO status
  if (!isPro()) {
    showProFeatureUpsell('cost', `
Cost estimation shows you:
  • Exact API costs before sending
  • Comparison across models
  • Input vs output cost breakdown
  • Save money by choosing optimal model

Stop getting surprised by API bills!
    `);
    process.exit(1);
  }

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

  // Increment operation count
  incrementOps();

  if (options.compare || !model) {
    // Compare all models
    printCostComparison(files, outputTokens);
  } else {
    // Single model cost
    printSingleCost(files, model, outputTokens);
  }

  // Show tip
  maybeShowProTip('cost');
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

  header(`💰 Cost Estimate: ${model}`);
  console.log('');

  console.log(`  ${colors.dim('Input tokens:')}   ${formatNumber(tokenResult.totalTokens)}`);
  console.log(`  ${colors.dim('Output tokens:')}  ${formatNumber(outputTokens)} (estimated)`);
  console.log('');

  console.log(`  ${colors.dim('Input cost:')}     ${formatMoney(cost.inputCost)}`);
  console.log(`  ${colors.dim('Output cost:')}    ${formatMoney(cost.outputCost)}`);
  console.log(`  ${colors.bold('Total cost:')}     ${colors.price(formatMoney(cost.totalCost))}`);

  console.log('');
  console.log(`  ${colors.dim('Context usage:')} ${(cost.contextUsage * 100).toFixed(1)}%`);
  console.log(`  ${colors.dim('Remaining:')}     ${formatNumber(cost.contextRemaining)} tokens`);

  if (cost.contextUsage > 1) {
    console.log('');
    console.log(colors.error('⚠ Context limit exceeded! Use optimize or split.'));
  }
}

/**
 * Print cost comparison across models
 */
function printCostComparison(files, outputTokens) {
  header('💰 Cost Comparison');
  console.log('');

  // Count tokens for each model (they'll be similar for cl100k_base)
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
        fits: cost.contextUsage <= 1,
      });
    }
  }

  // Sort by total cost
  costs.sort((a, b) => a.totalCost - b.totalCost);

  // Display comparison
  const headers = ['Model', 'Tokens', 'Input $', 'Output $', 'Total $', 'Fits'];
  const rows = costs.map(c => [
    c.model,
    formatNumber(c.inputTokens),
    formatMoney(c.inputCost),
    formatMoney(c.outputCost),
    formatMoney(c.totalCost),
    c.fits ? colors.success('✓') : colors.error('✗'),
  ]);

  table(headers, rows);

  console.log('');
  console.log(colors.dim(`Estimated output: ${formatNumber(outputTokens)} tokens`));
  console.log(colors.dim('Use --output <tokens> to change output estimate'));

  // Recommendation
  const bestFit = costs.find(c => c.fits);
  const cheapest = costs[0];

  console.log('');
  separator();
  console.log('');

  if (bestFit) {
    console.log(colors.success('💡 Recommendation:'));
    console.log(`   Best value: ${colors.bold(bestFit.model)} at ${colors.price(formatMoney(bestFit.totalCost))}`);

    if (cheapest.model !== bestFit.model) {
      console.log(`   Cheapest (may not fit): ${cheapest.model} at ${formatMoney(cheapest.totalCost)}`);
    }
  } else {
    console.log(colors.warning('⚠ Content exceeds all model context limits'));
    console.log('   Use optimize or split commands to fit within limits');
  }
}

module.exports = { execute };

/**
 * ctxstuff - LLM Context Packing Tool
 *
 * Programmatic API for packing codebases into LLM-ready context.
 *
 * @example
 * const { pack, count, format } = require('ctxstuff');
 *
 * // Pack a directory
 * const result = await pack('./my-project');
 *
 * // Count tokens
 * const tokens = count(result.files);
 *
 * // Format output
 * const markdown = format(result, 'markdown');
 */

const { packDirectory, getFileTree, collectFiles } = require('./src/core/packer');
const {
  estimateTokens,
  countTokens,
  countFilesTokens,
  calculateCost,
  getModelInfo,
  listModels,
} = require('./src/core/tokenizer');
const { optimizeContext, getSuggestions } = require('./src/core/optimizer');
const { splitContext, suggestSplit } = require('./src/core/splitter');
const { format, formatMarkdown, formatXML, formatPlain, formatJSON, FORMATS } = require('./src/core/formatter');
const { isPro, activateLicense, getLicenseStatus } = require('./src/license/checker');
const { checkFileLimit, checkSizeLimit, getLimitStatus } = require('./src/license/limits');
const { MODEL_PRICING, DEFAULT_MODEL, FREE_LIMITS } = require('./src/license/constants');

/**
 * Pack a directory into LLM-ready context
 * @param {string} directory - Directory to pack
 * @param {Object} options - Packing options
 * @returns {Promise<Object>} Packed result
 */
async function pack(directory, options = {}) {
  return packDirectory(directory, options);
}

/**
 * Count tokens in text or files
 * @param {string|Object[]} input - Text string or array of file objects
 * @param {string} model - Model name
 * @returns {Object} Token count result
 */
function count(input, model = DEFAULT_MODEL) {
  if (typeof input === 'string') {
    return countTokens(input, model);
  }
  return countFilesTokens(input, model);
}

/**
 * Optimize packed content to fit token limit (PRO only)
 * @param {Object} packed - Packed directory result
 * @param {Object} options - Optimization options
 * @returns {Object} Optimized result
 */
function optimize(packed, options = {}) {
  return optimizeContext(packed, options);
}

/**
 * Split packed content into chunks (PRO only)
 * @param {Object} packed - Packed directory result
 * @param {Object} options - Split options
 * @returns {Object} Split result with chunks
 */
function split(packed, options = {}) {
  return splitContext(packed, options);
}

/**
 * Calculate API cost for tokens
 * @param {number} inputTokens - Input token count
 * @param {number} outputTokens - Output token count
 * @param {string} model - Model name
 * @returns {Object} Cost breakdown
 */
function cost(inputTokens, outputTokens = 0, model = DEFAULT_MODEL) {
  return calculateCost(inputTokens, outputTokens, model);
}

module.exports = {
  // Main functions
  pack,
  count,
  format,
  optimize,
  split,
  cost,

  // Core modules
  packDirectory,
  getFileTree,
  collectFiles,
  estimateTokens,
  countTokens,
  countFilesTokens,
  calculateCost,
  getModelInfo,
  listModels,
  optimizeContext,
  getSuggestions,
  splitContext,
  suggestSplit,
  formatMarkdown,
  formatXML,
  formatPlain,
  formatJSON,

  // License
  isPro,
  activateLicense,
  getLicenseStatus,
  checkFileLimit,
  checkSizeLimit,
  getLimitStatus,

  // Constants
  MODEL_PRICING,
  DEFAULT_MODEL,
  FREE_LIMITS,
  FORMATS,
};

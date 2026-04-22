/**
 * Token counting module
 * @module core/tokenizer
 *
 * FREE: Uses ~4 chars/token estimate
 * PRO: Uses tiktoken for accurate counts
 */

const { isPro } = require('../license/checker');
const { MODEL_PRICING, DEFAULT_MODEL } = require('../license/constants');

// Lazy-load tiktoken for PRO users
let tiktoken = null;
let encoderCache = {};

/**
 * Get tiktoken encoder for a model
 * @param {string} model - Model name
 * @returns {Object|null} Encoder or null if not available
 */
function getEncoder(model) {
  if (!isPro()) return null;

  try {
    if (!tiktoken) {
      tiktoken = require('tiktoken');
    }

    const modelInfo = MODEL_PRICING[model] || MODEL_PRICING[DEFAULT_MODEL];
    const encoding = modelInfo.tokenizer || 'cl100k_base';

    if (!encoderCache[encoding]) {
      encoderCache[encoding] = tiktoken.get_encoding(encoding);
    }

    return encoderCache[encoding];
  } catch (e) {
    // tiktoken not installed or error
    return null;
  }
}

/**
 * Estimate tokens (FREE version - ~4 chars/token)
 * @param {string} text - Text to count
 * @returns {number} Estimated token count
 */
function estimateTokens(text) {
  if (!text) return 0;
  // Average of ~4 characters per token for English
  // Slightly adjust for code which tends to have more tokens per char
  return Math.ceil(text.length / 4);
}

/**
 * Count tokens accurately (PRO version with tiktoken)
 * @param {string} text - Text to count
 * @param {string} model - Model name
 * @returns {number} Token count
 */
function countTokensAccurate(text, model = DEFAULT_MODEL) {
  if (!text) return 0;

  const encoder = getEncoder(model);
  if (!encoder) {
    return estimateTokens(text);
  }

  try {
    return encoder.encode(text).length;
  } catch (e) {
    return estimateTokens(text);
  }
}

/**
 * Count tokens (uses accurate method for PRO, estimate for FREE)
 * @param {string} text - Text to count
 * @param {string} model - Model name
 * @returns {Object} Token info
 */
function countTokens(text, model = DEFAULT_MODEL) {
  if (!text) {
    return { tokens: 0, accurate: false };
  }

  if (isPro()) {
    const encoder = getEncoder(model);
    if (encoder) {
      try {
        const tokens = encoder.encode(text).length;
        return { tokens, accurate: true, model };
      } catch (e) {
        // Fall through to estimate
      }
    }
  }

  return {
    tokens: estimateTokens(text),
    accurate: false,
    model,
  };
}

/**
 * Count tokens for multiple files
 * @param {Object[]} files - Array of file objects with content
 * @param {string} model - Model name
 * @returns {Object} Token counts and details
 */
function countFilesTokens(files, model = DEFAULT_MODEL) {
  let totalTokens = 0;
  const fileTokens = [];
  const isAccurate = isPro() && getEncoder(model) !== null;

  for (const file of files) {
    const result = countTokens(file.content || '', model);
    totalTokens += result.tokens;
    fileTokens.push({
      path: file.path,
      tokens: result.tokens,
      size: file.size || (file.content ? file.content.length : 0),
    });
  }

  return {
    totalTokens,
    fileTokens,
    accurate: isAccurate,
    model,
  };
}

/**
 * Get token info for a model
 * @param {string} model - Model name
 * @returns {Object} Model token info
 */
function getModelInfo(model) {
  const info = MODEL_PRICING[model];
  if (!info) {
    return {
      model,
      known: false,
      context: null,
      pricing: null,
    };
  }

  return {
    model,
    known: true,
    context: info.context,
    pricing: {
      input: info.input,
      output: info.output,
    },
    tokenizer: info.tokenizer,
  };
}

/**
 * Calculate cost for tokens
 * @param {number} inputTokens - Input token count
 * @param {number} outputTokens - Expected output tokens
 * @param {string} model - Model name
 * @returns {Object} Cost breakdown
 */
function calculateCost(inputTokens, outputTokens = 0, model = DEFAULT_MODEL) {
  const info = MODEL_PRICING[model];
  if (!info) {
    return { error: `Unknown model: ${model}` };
  }

  const inputCost = (inputTokens / 1_000_000) * info.input;
  const outputCost = (outputTokens / 1_000_000) * info.output;

  return {
    model,
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    contextUsage: inputTokens / info.context,
    contextRemaining: info.context - inputTokens,
  };
}

/**
 * List all supported models
 * @returns {Object[]} Model list
 */
function listModels() {
  return Object.entries(MODEL_PRICING).map(([name, info]) => ({
    name,
    context: info.context,
    inputPrice: info.input,
    outputPrice: info.output,
    tokenizer: info.tokenizer,
  }));
}

/**
 * Check if tiktoken is available
 * @returns {boolean}
 */
function hasTiktoken() {
  try {
    require.resolve('tiktoken');
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  estimateTokens,
  countTokensAccurate,
  countTokens,
  countFilesTokens,
  getModelInfo,
  calculateCost,
  listModels,
  hasTiktoken,
  DEFAULT_MODEL,
};

/**
 * Context optimizer module (PRO feature)
 * @module core/optimizer
 *
 * Optimizes packed content to fit within token limits
 * by intelligently prioritizing and truncating content.
 */

const { isPro } = require('../license/checker');
const { countTokens, getModelInfo } = require('./tokenizer');
const { DEFAULT_MODEL } = require('../license/constants');

/**
 * Optimization strategies
 */
const STRATEGIES = {
  // Remove comments and docstrings
  REMOVE_COMMENTS: 'remove_comments',
  // Remove empty lines
  REMOVE_EMPTY_LINES: 'remove_empty_lines',
  // Truncate large files
  TRUNCATE_LARGE: 'truncate_large',
  // Skip low-priority files
  SKIP_LOW_PRIORITY: 'skip_low_priority',
  // Minify code (remove extra whitespace)
  MINIFY: 'minify',
};

/**
 * Remove comments from code
 * @param {string} content - File content
 * @param {string} ext - File extension
 * @returns {string} Content without comments
 */
function removeComments(content, ext) {
  const jsLike = ['js', 'ts', 'jsx', 'tsx', 'java', 'c', 'cpp', 'cs', 'go', 'rs'];
  const pyLike = ['py', 'rb', 'sh', 'bash', 'zsh', 'yaml', 'yml'];

  if (jsLike.includes(ext)) {
    // Remove // comments
    content = content.replace(/\/\/.*$/gm, '');
    // Remove /* */ comments
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
  }

  if (pyLike.includes(ext)) {
    // Remove # comments (but not shebang)
    content = content.replace(/^([^#]*)(#(?!!).*)$/gm, '$1');
    // Remove docstrings
    content = content.replace(/"""[\s\S]*?"""/g, '""""""');
    content = content.replace(/'''[\s\S]*?'''/g, "''''''");
  }

  return content;
}

/**
 * Remove empty lines from content
 * @param {string} content
 * @returns {string}
 */
function removeEmptyLines(content) {
  return content
    .split('\n')
    .filter(line => line.trim() !== '')
    .join('\n');
}

/**
 * Minify code (remove extra whitespace)
 * @param {string} content
 * @returns {string}
 */
function minifyCode(content) {
  // Reduce multiple spaces to single space (but preserve indentation structure)
  return content
    .split('\n')
    .map(line => {
      const indent = line.match(/^(\s*)/)[1];
      const rest = line.slice(indent.length);
      return indent + rest.replace(/\s+/g, ' ').trim();
    })
    .join('\n');
}

/**
 * Truncate file to approximate token limit
 * @param {string} content
 * @param {number} maxTokens
 * @param {string} model
 * @returns {string}
 */
function truncateToTokens(content, maxTokens, model = DEFAULT_MODEL) {
  const { tokens } = countTokens(content, model);
  if (tokens <= maxTokens) return content;

  // Estimate characters per token and truncate
  const charRatio = content.length / tokens;
  const targetChars = Math.floor(maxTokens * charRatio * 0.95); // 5% buffer

  const lines = content.split('\n');
  let result = '';
  let charCount = 0;

  for (const line of lines) {
    if (charCount + line.length > targetChars) {
      result += '\n// ... truncated ...';
      break;
    }
    result += line + '\n';
    charCount += line.length + 1;
  }

  return result.trimEnd();
}

/**
 * Optimize a single file
 * @param {Object} file - File object with path, content
 * @param {Object} options - Optimization options
 * @returns {Object} Optimized file
 */
function optimizeFile(file, options = {}) {
  let content = file.content;
  const ext = file.path.split('.').pop().toLowerCase();
  const appliedStrategies = [];

  if (options.removeComments) {
    const before = content.length;
    content = removeComments(content, ext);
    if (content.length < before) {
      appliedStrategies.push(STRATEGIES.REMOVE_COMMENTS);
    }
  }

  if (options.removeEmptyLines) {
    const before = content.length;
    content = removeEmptyLines(content);
    if (content.length < before) {
      appliedStrategies.push(STRATEGIES.REMOVE_EMPTY_LINES);
    }
  }

  if (options.minify) {
    const before = content.length;
    content = minifyCode(content);
    if (content.length < before) {
      appliedStrategies.push(STRATEGIES.MINIFY);
    }
  }

  if (options.maxTokensPerFile) {
    const before = content.length;
    content = truncateToTokens(content, options.maxTokensPerFile, options.model);
    if (content.length < before) {
      appliedStrategies.push(STRATEGIES.TRUNCATE_LARGE);
    }
  }

  return {
    ...file,
    content,
    originalSize: file.size || file.content.length,
    optimizedSize: content.length,
    strategies: appliedStrategies,
  };
}

/**
 * Optimize packed context to fit token limit (PRO only)
 * @param {Object} packed - Packed directory result
 * @param {Object} options - Optimization options
 * @returns {Object} Optimized result
 */
function optimizeContext(packed, options = {}) {
  if (!isPro()) {
    return {
      error: 'Context optimization is a PRO feature',
      proRequired: true,
    };
  }

  const {
    targetTokens = null,
    model = DEFAULT_MODEL,
    removeComments = true,
    removeEmptyLines = true,
    minify = false,
    preservePriority = 50, // Files with priority <= this are never truncated
  } = options;

  const modelInfo = getModelInfo(model);
  const maxTokens = targetTokens || (modelInfo.known ? modelInfo.context * 0.9 : 100000);

  // Phase 1: Optimize all files
  const optimizedFiles = packed.files.map(file =>
    optimizeFile(file, { removeComments, removeEmptyLines, minify, model })
  );

  // Calculate current token count
  let totalContent = optimizedFiles.map(f => f.content).join('\n');
  let { tokens: currentTokens } = countTokens(totalContent, model);

  // Phase 2: If still over limit, truncate low-priority files
  if (currentTokens > maxTokens) {
    const sortedByPriority = [...optimizedFiles].sort((a, b) => b.priority - a.priority);

    for (const file of sortedByPriority) {
      if (file.priority <= preservePriority) continue;
      if (currentTokens <= maxTokens) break;

      const index = optimizedFiles.findIndex(f => f.path === file.path);
      const maxFileTokens = Math.floor((file.content.length / totalContent.length) * maxTokens * 0.5);

      optimizedFiles[index] = optimizeFile(file, {
        ...options,
        maxTokensPerFile: maxFileTokens,
        model,
      });

      // Recalculate
      totalContent = optimizedFiles.map(f => f.content).join('\n');
      currentTokens = countTokens(totalContent, model).tokens;
    }
  }

  // Phase 3: If still over, drop lowest priority files
  let droppedFiles = [];
  while (currentTokens > maxTokens && optimizedFiles.length > 0) {
    const lowestPriority = optimizedFiles.reduce((lowest, file, idx) =>
      file.priority > (optimizedFiles[lowest]?.priority || 0) ? idx : lowest
    , 0);

    const dropped = optimizedFiles.splice(lowestPriority, 1)[0];
    droppedFiles.push(dropped.path);

    totalContent = optimizedFiles.map(f => f.content).join('\n');
    currentTokens = countTokens(totalContent, model).tokens;
  }

  return {
    ...packed,
    files: optimizedFiles,
    totalFiles: optimizedFiles.length,
    totalSize: optimizedFiles.reduce((sum, f) => sum + f.optimizedSize, 0),
    originalSize: packed.originalSize,
    tokens: currentTokens,
    targetTokens: maxTokens,
    optimized: true,
    droppedFiles,
    strategies: {
      removeComments,
      removeEmptyLines,
      minify,
    },
  };
}

/**
 * Get optimization suggestions
 * @param {Object} packed - Packed directory result
 * @param {string} model - Target model
 * @returns {Object} Suggestions
 */
function getSuggestions(packed, model = DEFAULT_MODEL) {
  const modelInfo = getModelInfo(model);
  const totalContent = packed.files.map(f => f.content).join('\n');
  const { tokens } = countTokens(totalContent, model);

  const suggestions = [];

  if (modelInfo.known && tokens > modelInfo.context) {
    suggestions.push({
      severity: 'error',
      message: `Content (${tokens.toLocaleString()} tokens) exceeds ${model} context (${modelInfo.context.toLocaleString()})`,
      action: 'Run optimize command to fit within limit',
    });
  } else if (modelInfo.known && tokens > modelInfo.context * 0.9) {
    suggestions.push({
      severity: 'warning',
      message: `Using ${Math.round(tokens / modelInfo.context * 100)}% of ${model} context`,
      action: 'Consider optimizing to leave room for output',
    });
  }

  // Check for large files
  const largeFiles = packed.files.filter(f => f.size > 10000);
  if (largeFiles.length > 0) {
    suggestions.push({
      severity: 'info',
      message: `${largeFiles.length} large files detected`,
      action: 'Consider using --max-file-size flag',
    });
  }

  return {
    tokens,
    model,
    contextLimit: modelInfo.known ? modelInfo.context : null,
    suggestions,
  };
}

module.exports = {
  optimizeContext,
  optimizeFile,
  getSuggestions,
  removeComments,
  removeEmptyLines,
  minifyCode,
  truncateToTokens,
  STRATEGIES,
};

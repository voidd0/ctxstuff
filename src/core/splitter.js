/**
 * Context splitter module (PRO feature)
 * @module core/splitter
 *
 * Splits large codebases into manageable chunks
 * that fit within model context limits.
 */

const { isPro } = require('../license/checker');
const { countTokens, getModelInfo, countFilesTokens } = require('./tokenizer');
const { DEFAULT_MODEL } = require('../license/constants');

/**
 * Split strategies
 */
const SPLIT_STRATEGIES = {
  // Split by file count
  BY_FILES: 'by_files',
  // Split by token count
  BY_TOKENS: 'by_tokens',
  // Split by directory structure
  BY_DIRECTORY: 'by_directory',
  // Split by file type
  BY_TYPE: 'by_type',
};

/**
 * Group files by directory
 * @param {Object[]} files - Array of file objects
 * @returns {Object} Files grouped by top-level directory
 */
function groupByDirectory(files) {
  const groups = {};

  for (const file of files) {
    const parts = file.path.split('/');
    const topDir = parts.length > 1 ? parts[0] : '_root';

    if (!groups[topDir]) {
      groups[topDir] = [];
    }
    groups[topDir].push(file);
  }

  return groups;
}

/**
 * Group files by extension/type
 * @param {Object[]} files - Array of file objects
 * @returns {Object} Files grouped by type
 */
function groupByType(files) {
  const typeMap = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    css: 'styles',
    scss: 'styles',
    less: 'styles',
    html: 'markup',
    xml: 'markup',
    json: 'config',
    yaml: 'config',
    yml: 'config',
    toml: 'config',
    md: 'docs',
    txt: 'docs',
  };

  const groups = {};

  for (const file of files) {
    const ext = file.path.split('.').pop().toLowerCase();
    const type = typeMap[ext] || 'other';

    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(file);
  }

  return groups;
}

/**
 * Split files into chunks by token limit
 * @param {Object[]} files - Array of file objects
 * @param {number} maxTokens - Maximum tokens per chunk
 * @param {string} model - Model name
 * @returns {Object[][]} Array of file chunks
 */
function splitByTokens(files, maxTokens, model = DEFAULT_MODEL) {
  const chunks = [];
  let currentChunk = [];
  let currentTokens = 0;

  for (const file of files) {
    const { tokens } = countTokens(file.content || '', model);

    // If single file exceeds limit, it goes in its own chunk
    if (tokens > maxTokens) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentTokens = 0;
      }
      chunks.push([file]);
      continue;
    }

    // If adding file would exceed limit, start new chunk
    if (currentTokens + tokens > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentTokens = 0;
    }

    currentChunk.push(file);
    currentTokens += tokens;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Split files into chunks by file count
 * @param {Object[]} files - Array of file objects
 * @param {number} filesPerChunk - Maximum files per chunk
 * @returns {Object[][]} Array of file chunks
 */
function splitByFiles(files, filesPerChunk) {
  const chunks = [];

  for (let i = 0; i < files.length; i += filesPerChunk) {
    chunks.push(files.slice(i, i + filesPerChunk));
  }

  return chunks;
}

/**
 * Split packed context into multiple chunks (PRO only)
 * @param {Object} packed - Packed directory result
 * @param {Object} options - Split options
 * @returns {Object} Split result with chunks
 */
function splitContext(packed, options = {}) {
  if (!isPro()) {
    return {
      error: 'Context splitting is a PRO feature',
      proRequired: true,
    };
  }

  const {
    strategy = SPLIT_STRATEGIES.BY_TOKENS,
    model = DEFAULT_MODEL,
    maxTokensPerChunk = null,
    maxFilesPerChunk = null,
    overlap = false,
    overlapFiles = 2,
  } = options;

  const modelInfo = getModelInfo(model);
  let chunks = [];

  switch (strategy) {
    case SPLIT_STRATEGIES.BY_TOKENS: {
      const tokenLimit = maxTokensPerChunk ||
        (modelInfo.known ? Math.floor(modelInfo.context * 0.85) : 50000);
      chunks = splitByTokens(packed.files, tokenLimit, model);
      break;
    }

    case SPLIT_STRATEGIES.BY_FILES: {
      const fileLimit = maxFilesPerChunk || 20;
      chunks = splitByFiles(packed.files, fileLimit);
      break;
    }

    case SPLIT_STRATEGIES.BY_DIRECTORY: {
      const groups = groupByDirectory(packed.files);
      chunks = Object.values(groups);
      break;
    }

    case SPLIT_STRATEGIES.BY_TYPE: {
      const groups = groupByType(packed.files);
      chunks = Object.values(groups);
      break;
    }

    default:
      return { error: `Unknown strategy: ${strategy}` };
  }

  // Add overlap if requested
  if (overlap && chunks.length > 1) {
    for (let i = 1; i < chunks.length; i++) {
      const prevChunk = chunks[i - 1];
      const overlapItems = prevChunk.slice(-overlapFiles);
      chunks[i] = [...overlapItems, ...chunks[i]];
    }
  }

  // Calculate stats for each chunk
  const chunkStats = chunks.map((chunk, index) => {
    const tokenResult = countFilesTokens(chunk, model);
    return {
      index: index + 1,
      files: chunk.length,
      tokens: tokenResult.totalTokens,
      size: chunk.reduce((sum, f) => sum + (f.size || f.content?.length || 0), 0),
      filePaths: chunk.map(f => f.path),
    };
  });

  return {
    directory: packed.directory,
    tree: packed.tree,
    strategy,
    model,
    totalChunks: chunks.length,
    chunks: chunks.map((files, i) => ({
      ...chunkStats[i],
      files: files,
    })),
    stats: {
      totalFiles: packed.files.length,
      totalTokens: chunkStats.reduce((sum, c) => sum + c.tokens, 0),
      avgTokensPerChunk: Math.round(chunkStats.reduce((sum, c) => sum + c.tokens, 0) / chunks.length),
      maxTokensInChunk: Math.max(...chunkStats.map(c => c.tokens)),
      minTokensInChunk: Math.min(...chunkStats.map(c => c.tokens)),
    },
  };
}

/**
 * Suggest optimal split configuration
 * @param {Object} packed - Packed directory result
 * @param {string} model - Target model
 * @returns {Object} Suggestions
 */
function suggestSplit(packed, model = DEFAULT_MODEL) {
  const modelInfo = getModelInfo(model);
  const tokenResult = countFilesTokens(packed.files, model);
  const { totalTokens } = tokenResult;

  if (!modelInfo.known) {
    return {
      needsSplit: totalTokens > 50000,
      suggestedChunks: Math.ceil(totalTokens / 50000),
      recommendation: 'Use --max-tokens flag to specify limit',
    };
  }

  const contextLimit = modelInfo.context;
  const safeLimit = contextLimit * 0.85; // Leave room for output

  if (totalTokens <= safeLimit) {
    return {
      needsSplit: false,
      tokens: totalTokens,
      contextUsage: totalTokens / contextLimit,
      recommendation: 'Content fits within context limit',
    };
  }

  const suggestedChunks = Math.ceil(totalTokens / safeLimit);
  const tokensPerChunk = Math.ceil(totalTokens / suggestedChunks);

  return {
    needsSplit: true,
    tokens: totalTokens,
    contextLimit,
    suggestedChunks,
    tokensPerChunk,
    recommendation: `Split into ${suggestedChunks} chunks of ~${tokensPerChunk.toLocaleString()} tokens each`,
    strategies: [
      { strategy: 'by_tokens', desc: 'Balanced chunks by token count' },
      { strategy: 'by_directory', desc: 'Group by directory structure' },
      { strategy: 'by_type', desc: 'Group by file type' },
    ],
  };
}

module.exports = {
  splitContext,
  suggestSplit,
  splitByTokens,
  splitByFiles,
  groupByDirectory,
  groupByType,
  SPLIT_STRATEGIES,
};

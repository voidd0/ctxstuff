/**
 * File packing module
 * @module core/packer
 */

const fs = require('fs');
const path = require('path');
const { loadCtxignore } = require('../utils/config');
const { isPro } = require('../license/checker');

// Default ignore patterns
const DEFAULT_IGNORE = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '__pycache__',
  '.venv',
  'venv',
  '.env',
  '.DS_Store',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '*.log',
  '*.map',
  '*.min.js',
  '*.min.css',
  'coverage',
  '.nyc_output',
  '.cache',
  '.idea',
  '.vscode',
  '*.pyc',
  '*.pyo',
  'Thumbs.db',
];

// Binary file extensions to skip
const BINARY_EXTENSIONS = [
  'png', 'jpg', 'jpeg', 'gif', 'ico', 'webp', 'svg', 'bmp', 'tiff',
  'mp3', 'mp4', 'wav', 'avi', 'mov', 'webm', 'flv', 'mkv',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'zip', 'tar', 'gz', 'rar', '7z', 'bz2', 'xz',
  'exe', 'dll', 'so', 'dylib', 'bin',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  'pyc', 'pyo', 'class', 'o', 'obj',
  'sqlite', 'db', 'sqlite3',
  'jar', 'war', 'ear',
];

// Priority file patterns (most important files first)
const PRIORITY_PATTERNS = [
  /^readme/i,
  /^package\.json$/,
  /^index\.(js|ts|jsx|tsx)$/,
  /^main\.(js|ts|py|go|rs)$/,
  /^app\.(js|ts|jsx|tsx|py)$/,
  /^server\.(js|ts)$/,
  /^config/i,
  /^\.env\.example$/,
  /src\/index/,
  /src\/main/,
  /src\/app/,
];

/**
 * Load .gitignore patterns
 * @param {string} dir - Directory
 * @returns {string[]}
 */
function loadGitignore(dir) {
  const gitignorePath = path.join(dir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) return [];

  const content = fs.readFileSync(gitignorePath, 'utf8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

/**
 * Check if a file should be ignored
 * @param {string} filePath - Full file path
 * @param {string} basePath - Base directory
 * @param {string[]} patterns - Ignore patterns
 * @returns {boolean}
 */
function shouldIgnore(filePath, basePath, patterns) {
  const relativePath = path.relative(basePath, filePath);
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();

  // Check binary extensions
  if (BINARY_EXTENSIONS.includes(ext)) return true;

  // Check ignore patterns
  for (const pattern of patterns) {
    // Exact match
    if (fileName === pattern || relativePath === pattern) return true;

    // Directory match
    if (relativePath.startsWith(pattern + '/') || relativePath.includes('/' + pattern + '/')) return true;
    if (fileName === pattern) return true;

    // Glob pattern (simple)
    if (pattern.startsWith('*')) {
      const suffix = pattern.slice(1);
      if (fileName.endsWith(suffix)) return true;
    }
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      if (fileName.startsWith(prefix)) return true;
    }

    // Contains
    if (relativePath.includes(pattern)) return true;
  }

  return false;
}

/**
 * Get file priority score (lower = more important)
 * @param {string} filePath
 * @returns {number}
 */
function getFilePriority(filePath) {
  const fileName = path.basename(filePath);
  const relativePath = filePath;

  for (let i = 0; i < PRIORITY_PATTERNS.length; i++) {
    if (PRIORITY_PATTERNS[i].test(fileName) || PRIORITY_PATTERNS[i].test(relativePath)) {
      return i;
    }
  }

  // Source files get higher priority than others
  if (relativePath.includes('src/')) return 100;
  if (relativePath.includes('lib/')) return 101;
  if (relativePath.includes('test/') || relativePath.includes('tests/')) return 200;
  if (relativePath.includes('doc/') || relativePath.includes('docs/')) return 201;

  return 150;
}

/**
 * Build file tree string
 * @param {string} dir - Directory to scan
 * @param {string} basePath - Base directory
 * @param {string[]} ignorePatterns - Patterns to ignore
 * @param {string} prefix - Tree prefix
 * @returns {string}
 */
function getFileTree(dir, basePath, ignorePatterns, prefix = '') {
  const items = fs.readdirSync(dir).sort();
  let tree = '';

  const filtered = items.filter(item => {
    const fullPath = path.join(dir, item);
    return !shouldIgnore(fullPath, basePath, ignorePatterns);
  });

  filtered.forEach((item, index) => {
    const fullPath = path.join(dir, item);
    const isLast = index === filtered.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      tree += `${prefix}${connector}${item}/\n`;
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      tree += getFileTree(fullPath, basePath, ignorePatterns, newPrefix);
    } else {
      tree += `${prefix}${connector}${item}\n`;
    }
  });

  return tree;
}

/**
 * Collect files from directory
 * @param {string} dir - Directory to scan
 * @param {string} basePath - Base directory
 * @param {Object} options - Options
 * @param {Object[]} files - Accumulated files
 * @returns {Object[]}
 */
function collectFiles(dir, basePath, options, files = []) {
  const items = fs.readdirSync(dir);
  const ignorePatterns = options.ignorePatterns;

  for (const item of items) {
    const fullPath = path.join(dir, item);

    if (shouldIgnore(fullPath, basePath, ignorePatterns)) continue;

    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      collectFiles(fullPath, basePath, options, files);
    } else {
      const ext = path.extname(item).slice(1).toLowerCase();

      // Filter by extension if specified
      if (options.extensions && !options.extensions.includes(ext)) continue;

      // Skip large files
      if (options.maxFileSize && stat.size > options.maxFileSize) continue;

      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        // Skip binary-looking files
        if (content.includes('\0')) continue;

        const relativePath = path.relative(basePath, fullPath);
        files.push({
          path: relativePath,
          content: content,
          size: stat.size,
          priority: getFilePriority(relativePath),
        });
      } catch (e) {
        // Skip unreadable files
      }
    }
  }

  return files;
}

/**
 * Pack a directory into context
 * @param {string} dir - Directory to pack
 * @param {Object} options - Packing options
 * @returns {Promise<Object>}
 */
async function packDirectory(dir, options = {}) {
  const opts = {
    extensions: options.extensions || null,
    ignore: options.ignore || [],
    maxFileSize: options.maxFileSize || 100 * 1024,
    includeTree: options.includeTree !== false,
    includeContent: options.includeContent !== false,
    priority: options.priority || null,
    maxFiles: options.maxFiles || null,
    maxTotalSize: options.maxTotalSize || null,
  };

  // Build ignore patterns
  const ignorePatterns = [
    ...DEFAULT_IGNORE,
    ...opts.ignore,
    ...loadGitignore(dir),
  ];

  // PRO: Add .ctxignore support
  if (isPro()) {
    ignorePatterns.push(...loadCtxignore(dir));
  }

  opts.ignorePatterns = ignorePatterns;

  // Get tree
  const tree = opts.includeTree ? getFileTree(dir, dir, ignorePatterns) : '';

  // Collect files
  let files = opts.includeContent ? collectFiles(dir, dir, opts) : [];

  // Sort by priority
  files.sort((a, b) => a.priority - b.priority);

  // Apply custom priority if specified
  if (opts.priority && Array.isArray(opts.priority)) {
    const priorityMap = {};
    opts.priority.forEach((pattern, index) => {
      priorityMap[pattern] = index - 1000; // Ensure they come first
    });

    files.sort((a, b) => {
      const aPriority = Object.keys(priorityMap).find(p => a.path.includes(p)) ? priorityMap[Object.keys(priorityMap).find(p => a.path.includes(p))] : a.priority;
      const bPriority = Object.keys(priorityMap).find(p => b.path.includes(p)) ? priorityMap[Object.keys(priorityMap).find(p => b.path.includes(p))] : b.priority;
      return aPriority - bPriority;
    });
  }

  // Calculate total size
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  // Apply file limit
  let truncated = false;
  if (opts.maxFiles && files.length > opts.maxFiles) {
    files = files.slice(0, opts.maxFiles);
    truncated = true;
  }

  // Apply size limit
  if (opts.maxTotalSize) {
    let currentSize = 0;
    const limitedFiles = [];
    for (const file of files) {
      if (currentSize + file.size <= opts.maxTotalSize) {
        limitedFiles.push(file);
        currentSize += file.size;
      } else {
        truncated = true;
        break;
      }
    }
    files = limitedFiles;
  }

  return {
    directory: path.basename(dir),
    tree,
    files,
    totalFiles: files.length,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
    originalSize: totalSize,
    truncated,
  };
}

module.exports = {
  packDirectory,
  getFileTree,
  collectFiles,
  shouldIgnore,
  getFilePriority,
  DEFAULT_IGNORE,
  BINARY_EXTENSIONS,
  PRIORITY_PATTERNS,
};

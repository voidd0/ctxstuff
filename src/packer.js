const fs = require('fs');
const path = require('path');

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
  '.cache'
];

const BINARY_EXTENSIONS = [
  'png', 'jpg', 'jpeg', 'gif', 'ico', 'webp', 'svg',
  'mp3', 'mp4', 'wav', 'avi', 'mov',
  'pdf', 'doc', 'docx', 'xls', 'xlsx',
  'zip', 'tar', 'gz', 'rar',
  'exe', 'dll', 'so', 'dylib',
  'woff', 'woff2', 'ttf', 'eot',
  'pyc', 'pyo', 'class'
];

function loadGitignore(dir) {
  const gitignorePath = path.join(dir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) return [];
  
  const content = fs.readFileSync(gitignorePath, 'utf-8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

function shouldIgnore(filePath, basePath, ignorePatterns) {
  const relativePath = path.relative(basePath, filePath);
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  
  // Check binary extensions
  if (BINARY_EXTENSIONS.includes(ext)) return true;
  
  // Check ignore patterns
  for (const pattern of ignorePatterns) {
    // Exact match
    if (fileName === pattern || relativePath === pattern) return true;
    
    // Directory match
    if (relativePath.startsWith(pattern + '/') || relativePath.includes('/' + pattern + '/')) return true;
    
    // Glob pattern (simple)
    if (pattern.startsWith('*')) {
      const suffix = pattern.slice(1);
      if (fileName.endsWith(suffix)) return true;
    }
    
    // Contains
    if (relativePath.includes(pattern)) return true;
  }
  
  return false;
}

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

function collectFiles(dir, basePath, options, files = []) {
  const items = fs.readdirSync(dir);
  const ignorePatterns = [...DEFAULT_IGNORE, ...options.ignore, ...loadGitignore(basePath)];
  
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
      if (stat.size > options.maxSize) continue;
      
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        // Skip binary-looking files
        if (content.includes('\0')) continue;
        
        files.push({
          path: path.relative(basePath, fullPath),
          content: content,
          size: stat.size
        });
      } catch (e) {
        // Skip unreadable files
      }
    }
  }
  
  return files;
}

async function packDirectory(dir, options = {}) {
  const opts = {
    extensions: options.extensions || null,
    ignore: options.ignore || [],
    maxSize: options.maxSize || 100 * 1024,
    includeTree: options.includeTree !== false,
    includeContent: options.includeContent !== false
  };
  
  const ignorePatterns = [...DEFAULT_IGNORE, ...opts.ignore, ...loadGitignore(dir)];
  
  const tree = opts.includeTree ? getFileTree(dir, dir, ignorePatterns) : '';
  const files = opts.includeContent ? collectFiles(dir, dir, opts) : [];
  
  return {
    directory: path.basename(dir),
    tree,
    files
  };
}

function formatOutput(result, format) {
  switch (format) {
    case 'xml':
      return formatXML(result);
    case 'plain':
      return formatPlain(result);
    case 'markdown':
    default:
      return formatMarkdown(result);
  }
}

function formatMarkdown(result) {
  let output = `# ${result.directory}\n\n`;
  
  if (result.tree) {
    output += `## File Tree\n\n\`\`\`\n${result.tree}\`\`\`\n\n`;
  }
  
  if (result.files.length > 0) {
    output += `## Files\n\n`;
    
    for (const file of result.files) {
      const ext = path.extname(file.path).slice(1) || 'text';
      output += `### ${file.path}\n\n`;
      output += `\`\`\`${ext}\n${file.content}\n\`\`\`\n\n`;
    }
  }
  
  output += `---\n*Packed with [ctxstuff](https://voiddo.com/tools/ctxstuff/) by voiddo.com*\n`;
  
  return output;
}

function formatXML(result) {
  let output = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  output += `<context directory="${result.directory}">\n`;
  
  if (result.tree) {
    output += `  <tree>\n${result.tree.split('\n').map(l => '    ' + l).join('\n')}\n  </tree>\n`;
  }
  
  if (result.files.length > 0) {
    output += `  <files>\n`;
    for (const file of result.files) {
      output += `    <file path="${file.path}">\n`;
      output += `<![CDATA[\n${file.content}\n]]>\n`;
      output += `    </file>\n`;
    }
    output += `  </files>\n`;
  }
  
  output += `</context>\n`;
  output += `<!-- Packed with ctxstuff by voiddo.com -->\n`;
  
  return output;
}

function formatPlain(result) {
  let output = `=== ${result.directory} ===\n\n`;
  
  if (result.tree) {
    output += `--- FILE TREE ---\n${result.tree}\n`;
  }
  
  if (result.files.length > 0) {
    output += `--- FILES ---\n\n`;
    for (const file of result.files) {
      output += `=== ${file.path} ===\n${file.content}\n\n`;
    }
  }
  
  output += `// Packed with ctxstuff by voiddo.com\n`;
  
  return output;
}

function countTokens(text) {
  // Rough estimate: ~4 chars per token for English/code
  return Math.ceil(text.length / 4);
}

module.exports = { packDirectory, countTokens, formatOutput };

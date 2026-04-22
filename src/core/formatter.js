/**
 * Output formatter module
 * @module core/formatter
 *
 * Formats packed context in various output formats:
 * - markdown (default)
 * - xml
 * - plain
 * - json
 * - custom templates
 */

const { isPro } = require('../license/checker');

/**
 * Output formats
 */
const FORMATS = {
  MARKDOWN: 'markdown',
  XML: 'xml',
  PLAIN: 'plain',
  JSON: 'json',
};

/**
 * Get language identifier for syntax highlighting
 * @param {string} filePath - File path
 * @returns {string} Language identifier
 */
function getLanguage(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  const langMap = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    sh: 'bash',
    bash: 'bash',
    zsh: 'zsh',
    fish: 'fish',
    ps1: 'powershell',
    sql: 'sql',
    css: 'css',
    scss: 'scss',
    less: 'less',
    html: 'html',
    xml: 'xml',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    ini: 'ini',
    md: 'markdown',
    txt: 'text',
    vue: 'vue',
    svelte: 'svelte',
  };
  return langMap[ext] || ext || 'text';
}

/**
 * Format as Markdown
 * @param {Object} packed - Packed directory result
 * @param {Object} options - Format options
 * @returns {string} Markdown output
 */
function formatMarkdown(packed, options = {}) {
  const {
    includeTree = true,
    includeStats = true,
    fileHeaders = true,
  } = options;

  let output = '';

  // Header
  output += `# ${packed.directory}\n\n`;

  // Stats
  if (includeStats) {
    output += `**Files:** ${packed.totalFiles}`;
    if (packed.tokens) {
      output += ` | **Tokens:** ~${packed.tokens.toLocaleString()}`;
    }
    output += ` | **Size:** ${formatSize(packed.totalSize)}\n\n`;
  }

  // File tree
  if (includeTree && packed.tree) {
    output += '## File Structure\n\n';
    output += '```\n';
    output += packed.tree;
    output += '```\n\n';
  }

  // Files
  output += '## Files\n\n';

  for (const file of packed.files) {
    if (fileHeaders) {
      output += `### ${file.path}\n\n`;
    } else {
      output += `**${file.path}**\n\n`;
    }

    const lang = getLanguage(file.path);
    output += '```' + lang + '\n';
    output += file.content;
    if (!file.content.endsWith('\n')) {
      output += '\n';
    }
    output += '```\n\n';
  }

  return output.trim();
}

/**
 * Format as XML
 * @param {Object} packed - Packed directory result
 * @param {Object} options - Format options
 * @returns {string} XML output
 */
function formatXML(packed, options = {}) {
  const {
    includeTree = true,
    includeStats = true,
  } = options;

  let output = '<?xml version="1.0" encoding="UTF-8"?>\n';
  output += `<context directory="${escapeXml(packed.directory)}">\n`;

  if (includeStats) {
    output += '  <stats>\n';
    output += `    <files>${packed.totalFiles}</files>\n`;
    output += `    <size>${packed.totalSize}</size>\n`;
    if (packed.tokens) {
      output += `    <tokens>${packed.tokens}</tokens>\n`;
    }
    output += '  </stats>\n';
  }

  if (includeTree && packed.tree) {
    output += '  <tree>\n';
    output += '<![CDATA[\n';
    output += packed.tree;
    output += ']]>\n';
    output += '  </tree>\n';
  }

  output += '  <files>\n';

  for (const file of packed.files) {
    const lang = getLanguage(file.path);
    output += `    <file path="${escapeXml(file.path)}" language="${lang}" size="${file.size || file.content.length}">\n`;
    output += '<![CDATA[\n';
    output += file.content;
    if (!file.content.endsWith('\n')) {
      output += '\n';
    }
    output += ']]>\n';
    output += '    </file>\n';
  }

  output += '  </files>\n';
  output += '</context>';

  return output;
}

/**
 * Format as plain text
 * @param {Object} packed - Packed directory result
 * @param {Object} options - Format options
 * @returns {string} Plain text output
 */
function formatPlain(packed, options = {}) {
  const {
    includeTree = true,
    separator = '=' .repeat(60),
  } = options;

  let output = '';

  output += `Directory: ${packed.directory}\n`;
  output += `Files: ${packed.totalFiles} | Size: ${formatSize(packed.totalSize)}\n`;
  output += separator + '\n\n';

  if (includeTree && packed.tree) {
    output += 'FILE STRUCTURE:\n';
    output += packed.tree;
    output += '\n' + separator + '\n\n';
  }

  output += 'FILES:\n\n';

  for (const file of packed.files) {
    output += `--- ${file.path} ---\n\n`;
    output += file.content;
    if (!file.content.endsWith('\n')) {
      output += '\n';
    }
    output += '\n';
  }

  return output.trim();
}

/**
 * Format as JSON
 * @param {Object} packed - Packed directory result
 * @param {Object} options - Format options
 * @returns {string} JSON output
 */
function formatJSON(packed, options = {}) {
  const {
    pretty = true,
    includeContent = true,
  } = options;

  const data = {
    directory: packed.directory,
    stats: {
      totalFiles: packed.totalFiles,
      totalSize: packed.totalSize,
      tokens: packed.tokens || null,
    },
    tree: packed.tree || null,
    files: packed.files.map(file => ({
      path: file.path,
      size: file.size || file.content.length,
      language: getLanguage(file.path),
      content: includeContent ? file.content : undefined,
    })),
  };

  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

/**
 * Format with custom template (PRO only)
 * @param {Object} packed - Packed directory result
 * @param {string} template - Template string
 * @returns {string} Formatted output
 */
function formatTemplate(packed, template) {
  if (!isPro()) {
    return { error: 'Custom templates are a PRO feature', proRequired: true };
  }

  let output = template;

  // Replace placeholders
  output = output.replace(/\{\{directory\}\}/g, packed.directory);
  output = output.replace(/\{\{totalFiles\}\}/g, packed.totalFiles);
  output = output.replace(/\{\{totalSize\}\}/g, formatSize(packed.totalSize));
  output = output.replace(/\{\{tree\}\}/g, packed.tree || '');

  // Files loop
  const filesMatch = output.match(/\{\{#files\}\}([\s\S]*?)\{\{\/files\}\}/);
  if (filesMatch) {
    const fileTemplate = filesMatch[1];
    const filesOutput = packed.files.map(file => {
      let fileStr = fileTemplate;
      fileStr = fileStr.replace(/\{\{path\}\}/g, file.path);
      fileStr = fileStr.replace(/\{\{content\}\}/g, file.content);
      fileStr = fileStr.replace(/\{\{language\}\}/g, getLanguage(file.path));
      fileStr = fileStr.replace(/\{\{size\}\}/g, file.size || file.content.length);
      return fileStr;
    }).join('');

    output = output.replace(/\{\{#files\}\}[\s\S]*?\{\{\/files\}\}/, filesOutput);
  }

  return output;
}

/**
 * Format packed context
 * @param {Object} packed - Packed directory result
 * @param {string} format - Output format
 * @param {Object} options - Format options
 * @returns {string} Formatted output
 */
function format(packed, format = FORMATS.MARKDOWN, options = {}) {
  switch (format.toLowerCase()) {
    case FORMATS.MARKDOWN:
    case 'md':
      return formatMarkdown(packed, options);
    case FORMATS.XML:
      return formatXML(packed, options);
    case FORMATS.PLAIN:
    case 'text':
    case 'txt':
      return formatPlain(packed, options);
    case FORMATS.JSON:
      return formatJSON(packed, options);
    default:
      // Assume it's a custom template
      return formatTemplate(packed, format);
  }
}

/**
 * Escape XML special characters
 * @param {string} str
 * @returns {string}
 */
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format size in human readable format
 * @param {number} bytes
 * @returns {string}
 */
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

module.exports = {
  format,
  formatMarkdown,
  formatXML,
  formatPlain,
  formatJSON,
  formatTemplate,
  getLanguage,
  FORMATS,
};

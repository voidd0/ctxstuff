/**
 * Tests for core/formatter module
 */

const {
  format,
  formatMarkdown,
  formatXML,
  formatPlain,
  formatJSON,
  getLanguage,
  FORMATS,
} = require('../../src/core/formatter');

const mockPacked = {
  directory: 'test-project',
  tree: '├── index.js\n└── utils.js\n',
  files: [
    { path: 'index.js', content: 'console.log("hello");', size: 22 },
    { path: 'utils.js', content: 'module.exports = {};', size: 20 },
  ],
  totalFiles: 2,
  totalSize: 42,
  tokens: 10,
};

describe('FORMATS', () => {
  test('should define markdown format', () => {
    expect(FORMATS.MARKDOWN).toBe('markdown');
  });

  test('should define xml format', () => {
    expect(FORMATS.XML).toBe('xml');
  });

  test('should define plain format', () => {
    expect(FORMATS.PLAIN).toBe('plain');
  });

  test('should define json format', () => {
    expect(FORMATS.JSON).toBe('json');
  });
});

describe('getLanguage', () => {
  test('should return javascript for .js', () => {
    expect(getLanguage('file.js')).toBe('javascript');
  });

  test('should return typescript for .ts', () => {
    expect(getLanguage('file.ts')).toBe('typescript');
  });

  test('should return python for .py', () => {
    expect(getLanguage('file.py')).toBe('python');
  });

  test('should return extension for unknown types', () => {
    expect(getLanguage('file.xyz')).toBe('xyz');
  });

  test('should handle nested paths', () => {
    expect(getLanguage('src/components/Button.tsx')).toBe('tsx');
  });

  test('should handle config files', () => {
    expect(getLanguage('config.json')).toBe('json');
    expect(getLanguage('config.yaml')).toBe('yaml');
  });
});

describe('formatMarkdown', () => {
  test('should include header with directory name', () => {
    const output = formatMarkdown(mockPacked);
    expect(output).toContain('# test-project');
  });

  test('should include file tree', () => {
    const output = formatMarkdown(mockPacked);
    expect(output).toContain('## File Structure');
    expect(output).toContain('index.js');
  });

  test('should include files section', () => {
    const output = formatMarkdown(mockPacked);
    expect(output).toContain('## Files');
  });

  test('should include file headers', () => {
    const output = formatMarkdown(mockPacked);
    expect(output).toContain('### index.js');
    expect(output).toContain('### utils.js');
  });

  test('should include code blocks with language', () => {
    const output = formatMarkdown(mockPacked);
    expect(output).toContain('```javascript');
  });

  test('should include file content', () => {
    const output = formatMarkdown(mockPacked);
    expect(output).toContain('console.log("hello");');
  });

  test('should exclude tree when requested', () => {
    const output = formatMarkdown(mockPacked, { includeTree: false });
    expect(output).not.toContain('## File Structure');
  });

  test('should include stats when requested', () => {
    const output = formatMarkdown(mockPacked, { includeStats: true });
    expect(output).toContain('Files:');
    expect(output).toContain('Tokens:');
  });
});

describe('formatXML', () => {
  test('should include XML declaration', () => {
    const output = formatXML(mockPacked);
    expect(output).toContain('<?xml version="1.0"');
  });

  test('should include context root element', () => {
    const output = formatXML(mockPacked);
    expect(output).toContain('<context');
    expect(output).toContain('</context>');
  });

  test('should include directory attribute', () => {
    const output = formatXML(mockPacked);
    expect(output).toContain('directory="test-project"');
  });

  test('should include files element', () => {
    const output = formatXML(mockPacked);
    expect(output).toContain('<files>');
    expect(output).toContain('</files>');
  });

  test('should include file elements', () => {
    const output = formatXML(mockPacked);
    expect(output).toContain('<file path="index.js"');
  });

  test('should use CDATA for content', () => {
    const output = formatXML(mockPacked);
    expect(output).toContain('<![CDATA[');
  });

  test('should include stats when requested', () => {
    const output = formatXML(mockPacked, { includeStats: true });
    expect(output).toContain('<stats>');
    expect(output).toContain('<files>2</files>');
  });
});

describe('formatPlain', () => {
  test('should include directory name', () => {
    const output = formatPlain(mockPacked);
    expect(output).toContain('Directory: test-project');
  });

  test('should include file count', () => {
    const output = formatPlain(mockPacked);
    expect(output).toContain('Files: 2');
  });

  test('should include file tree', () => {
    const output = formatPlain(mockPacked);
    expect(output).toContain('FILE STRUCTURE:');
  });

  test('should include file separators', () => {
    const output = formatPlain(mockPacked);
    expect(output).toContain('--- index.js ---');
    expect(output).toContain('--- utils.js ---');
  });

  test('should include file content', () => {
    const output = formatPlain(mockPacked);
    expect(output).toContain('console.log("hello");');
  });
});

describe('formatJSON', () => {
  test('should return valid JSON', () => {
    const output = formatJSON(mockPacked);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  test('should include directory', () => {
    const output = formatJSON(mockPacked);
    const data = JSON.parse(output);
    expect(data.directory).toBe('test-project');
  });

  test('should include stats', () => {
    const output = formatJSON(mockPacked);
    const data = JSON.parse(output);
    expect(data.stats.totalFiles).toBe(2);
    expect(data.stats.totalSize).toBe(42);
  });

  test('should include files', () => {
    const output = formatJSON(mockPacked);
    const data = JSON.parse(output);
    expect(data.files).toHaveLength(2);
    expect(data.files[0].path).toBe('index.js');
  });

  test('should include file content by default', () => {
    const output = formatJSON(mockPacked);
    const data = JSON.parse(output);
    expect(data.files[0].content).toBeDefined();
  });

  test('should exclude content when requested', () => {
    const output = formatJSON(mockPacked, { includeContent: false });
    const data = JSON.parse(output);
    expect(data.files[0].content).toBeUndefined();
  });

  test('should respect pretty option', () => {
    const pretty = formatJSON(mockPacked, { pretty: true });
    const compact = formatJSON(mockPacked, { pretty: false });
    expect(pretty.length).toBeGreaterThan(compact.length);
  });
});

describe('format', () => {
  test('should default to markdown', () => {
    const output = format(mockPacked);
    expect(output).toContain('# test-project');
  });

  test('should accept format string', () => {
    const output = format(mockPacked, 'xml');
    expect(output).toContain('<?xml');
  });

  test('should accept md as markdown alias', () => {
    const output = format(mockPacked, 'md');
    expect(output).toContain('# test-project');
  });

  test('should accept txt as plain alias', () => {
    const output = format(mockPacked, 'txt');
    expect(output).toContain('Directory:');
  });

  test('should accept text as plain alias', () => {
    const output = format(mockPacked, 'text');
    expect(output).toContain('Directory:');
  });

  test('should pass options to formatter', () => {
    const output = format(mockPacked, 'markdown', { includeTree: false });
    expect(output).not.toContain('## File Structure');
  });
});

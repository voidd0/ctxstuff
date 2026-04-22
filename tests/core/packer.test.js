/**
 * Tests for core/packer module
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  packDirectory,
  getFileTree,
  collectFiles,
  shouldIgnore,
  getFilePriority,
  DEFAULT_IGNORE,
  BINARY_EXTENSIONS,
  PRIORITY_PATTERNS,
} = require('../../src/core/packer');

// Create temp directory for tests
const TEST_DIR = path.join(os.tmpdir(), 'ctxstuff-test-' + Date.now());

beforeAll(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
  fs.mkdirSync(path.join(TEST_DIR, 'src'), { recursive: true });
  fs.mkdirSync(path.join(TEST_DIR, 'node_modules', 'dep'), { recursive: true });

  // Create test files
  fs.writeFileSync(path.join(TEST_DIR, 'README.md'), '# Test Project\n');
  fs.writeFileSync(path.join(TEST_DIR, 'package.json'), '{"name": "test"}');
  fs.writeFileSync(path.join(TEST_DIR, 'src', 'index.js'), 'console.log("hello");');
  fs.writeFileSync(path.join(TEST_DIR, 'src', 'utils.js'), 'module.exports = {};');
  fs.writeFileSync(path.join(TEST_DIR, 'node_modules', 'dep', 'index.js'), 'ignored');
  fs.writeFileSync(path.join(TEST_DIR, '.gitignore'), 'node_modules\n');
});

afterAll(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('DEFAULT_IGNORE', () => {
  test('should include node_modules', () => {
    expect(DEFAULT_IGNORE).toContain('node_modules');
  });

  test('should include .git', () => {
    expect(DEFAULT_IGNORE).toContain('.git');
  });

  test('should include common build directories', () => {
    expect(DEFAULT_IGNORE).toContain('dist');
    expect(DEFAULT_IGNORE).toContain('build');
  });

  test('should include lock files', () => {
    expect(DEFAULT_IGNORE).toContain('package-lock.json');
    expect(DEFAULT_IGNORE).toContain('yarn.lock');
  });
});

describe('BINARY_EXTENSIONS', () => {
  test('should include image formats', () => {
    expect(BINARY_EXTENSIONS).toContain('png');
    expect(BINARY_EXTENSIONS).toContain('jpg');
    expect(BINARY_EXTENSIONS).toContain('gif');
  });

  test('should include compiled formats', () => {
    expect(BINARY_EXTENSIONS).toContain('exe');
    expect(BINARY_EXTENSIONS).toContain('dll');
    expect(BINARY_EXTENSIONS).toContain('pyc');
  });

  test('should include archive formats', () => {
    expect(BINARY_EXTENSIONS).toContain('zip');
    expect(BINARY_EXTENSIONS).toContain('tar');
    expect(BINARY_EXTENSIONS).toContain('gz');
  });
});

describe('PRIORITY_PATTERNS', () => {
  test('should prioritize README files', () => {
    expect(PRIORITY_PATTERNS[0].test('README.md')).toBe(true);
    expect(PRIORITY_PATTERNS[0].test('readme.txt')).toBe(true);
  });

  test('should prioritize package.json', () => {
    expect(PRIORITY_PATTERNS[1].test('package.json')).toBe(true);
  });

  test('should prioritize index files', () => {
    expect(PRIORITY_PATTERNS[2].test('index.js')).toBe(true);
    expect(PRIORITY_PATTERNS[2].test('index.ts')).toBe(true);
  });
});

describe('shouldIgnore', () => {
  test('should ignore node_modules', () => {
    const result = shouldIgnore(
      path.join(TEST_DIR, 'node_modules', 'pkg', 'file.js'),
      TEST_DIR,
      DEFAULT_IGNORE
    );
    expect(result).toBe(true);
  });

  test('should ignore binary files', () => {
    const result = shouldIgnore(
      path.join(TEST_DIR, 'image.png'),
      TEST_DIR,
      []
    );
    expect(result).toBe(true);
  });

  test('should not ignore source files', () => {
    const result = shouldIgnore(
      path.join(TEST_DIR, 'src', 'index.js'),
      TEST_DIR,
      DEFAULT_IGNORE
    );
    expect(result).toBe(false);
  });

  test('should handle glob patterns', () => {
    const result = shouldIgnore(
      path.join(TEST_DIR, 'file.log'),
      TEST_DIR,
      ['*.log']
    );
    expect(result).toBe(true);
  });
});

describe('getFilePriority', () => {
  test('should give README highest priority', () => {
    const priority = getFilePriority('README.md');
    expect(priority).toBe(0);
  });

  test('should give package.json second priority', () => {
    const priority = getFilePriority('package.json');
    expect(priority).toBe(1);
  });

  test('should give src files moderate priority', () => {
    const priority = getFilePriority('src/something.js');
    expect(priority).toBe(100);
  });

  test('should give test files lower priority', () => {
    const priority = getFilePriority('test/something.test.js');
    expect(priority).toBe(200);
  });
});

describe('getFileTree', () => {
  test('should generate tree structure', () => {
    const tree = getFileTree(TEST_DIR, TEST_DIR, DEFAULT_IGNORE);
    expect(tree).toContain('README.md');
    expect(tree).toContain('src/');
  });

  test('should exclude ignored directories', () => {
    const tree = getFileTree(TEST_DIR, TEST_DIR, DEFAULT_IGNORE);
    expect(tree).not.toContain('node_modules');
  });

  test('should use tree connectors', () => {
    const tree = getFileTree(TEST_DIR, TEST_DIR, DEFAULT_IGNORE);
    expect(tree).toMatch(/[├└]/);
  });
});

describe('collectFiles', () => {
  test('should collect all non-ignored files', () => {
    const files = collectFiles(TEST_DIR, TEST_DIR, { ignorePatterns: DEFAULT_IGNORE });
    expect(files.length).toBeGreaterThan(0);
  });

  test('should include file content', () => {
    const files = collectFiles(TEST_DIR, TEST_DIR, { ignorePatterns: DEFAULT_IGNORE });
    const readmeFile = files.find(f => f.path === 'README.md');
    expect(readmeFile).toBeDefined();
    expect(readmeFile.content).toContain('Test Project');
  });

  test('should include file size', () => {
    const files = collectFiles(TEST_DIR, TEST_DIR, { ignorePatterns: DEFAULT_IGNORE });
    files.forEach(f => {
      expect(f.size).toBeGreaterThan(0);
    });
  });

  test('should include file priority', () => {
    const files = collectFiles(TEST_DIR, TEST_DIR, { ignorePatterns: DEFAULT_IGNORE });
    files.forEach(f => {
      expect(typeof f.priority).toBe('number');
    });
  });

  test('should filter by extension', () => {
    const files = collectFiles(TEST_DIR, TEST_DIR, {
      ignorePatterns: DEFAULT_IGNORE,
      extensions: ['js'],
    });
    files.forEach(f => {
      expect(f.path).toMatch(/\.js$/);
    });
  });
});

describe('packDirectory', () => {
  test('should pack directory successfully', async () => {
    const result = await packDirectory(TEST_DIR);
    expect(result).toBeDefined();
    expect(result.directory).toBe(path.basename(TEST_DIR));
  });

  test('should include file tree', async () => {
    const result = await packDirectory(TEST_DIR);
    expect(result.tree).toBeDefined();
    expect(result.tree.length).toBeGreaterThan(0);
  });

  test('should include files array', async () => {
    const result = await packDirectory(TEST_DIR);
    expect(Array.isArray(result.files)).toBe(true);
    expect(result.files.length).toBeGreaterThan(0);
  });

  test('should sort files by priority', async () => {
    const result = await packDirectory(TEST_DIR);
    // README should be first (priority 0)
    const readmeIndex = result.files.findIndex(f => f.path === 'README.md');
    if (readmeIndex !== -1) {
      expect(readmeIndex).toBe(0);
    }
  });

  test('should respect maxFileSize option', async () => {
    const result = await packDirectory(TEST_DIR, { maxFileSize: 10 });
    result.files.forEach(f => {
      expect(f.size).toBeLessThanOrEqual(10);
    });
  });

  test('should calculate total size', async () => {
    const result = await packDirectory(TEST_DIR);
    expect(result.totalSize).toBeGreaterThan(0);
    const sumOfFileSizes = result.files.reduce((sum, f) => sum + f.size, 0);
    expect(result.totalSize).toBe(sumOfFileSizes);
  });

  test('should count total files', async () => {
    const result = await packDirectory(TEST_DIR);
    expect(result.totalFiles).toBe(result.files.length);
  });

  test('should exclude tree when requested', async () => {
    const result = await packDirectory(TEST_DIR, { includeTree: false });
    expect(result.tree).toBe('');
  });

  test('should exclude content when requested', async () => {
    const result = await packDirectory(TEST_DIR, { includeContent: false });
    expect(result.files.length).toBe(0);
  });
});

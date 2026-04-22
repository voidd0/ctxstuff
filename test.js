const { packDirectory, countTokens, formatOutput } = require('./src/packer');
const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('running tests... 💀\n');
  let passed = 0;
  let failed = 0;

  function test(name, condition) {
    if (condition) {
      console.log(`✓ ${name}`);
      passed++;
    } else {
      console.log(`✗ ${name}`);
      failed++;
    }
  }

  // Create temp test directory
  const testDir = path.join(__dirname, 'test_temp');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
  fs.writeFileSync(path.join(testDir, 'test.js'), 'console.log("test");');
  fs.writeFileSync(path.join(testDir, 'readme.md'), '# Test');

  // Test packDirectory
  const result = await packDirectory(testDir, {});
  test('packDirectory returns object', typeof result === 'object');
  test('result has tree', typeof result.tree === 'string');
  test('result has files array', Array.isArray(result.files));
  test('found test files', result.files.length >= 2);

  // Test formatOutput
  const markdown = formatOutput(result, 'markdown');
  test('markdown format works', markdown.includes('# '));
  test('markdown contains file tree', markdown.includes('File Tree'));

  const xml = formatOutput(result, 'xml');
  test('xml format works', xml.includes('<?xml'));
  test('xml has context tag', xml.includes('<context'));

  const plain = formatOutput(result, 'plain');
  test('plain format works', plain.includes('==='));

  // Test countTokens
  const tokens = countTokens('hello world this is a test');
  test('countTokens returns number', typeof tokens === 'number');
  test('countTokens reasonable estimate', tokens > 0 && tokens < 100);

  // Test with extensions filter
  const jsOnly = await packDirectory(testDir, { extensions: ['js'] });
  test('extension filter works', jsOnly.files.every(f => f.path.endsWith('.js')));

  // Cleanup
  fs.rmSync(testDir, { recursive: true });

  console.log(`\n${passed}/${passed + failed} tests passed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('test error:', err);
  process.exit(1);
});

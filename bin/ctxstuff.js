#!/usr/bin/env node

// ctxstuff — pack codebases into LLM-ready context.
// 60+ models, cost estimation, optimize/split/watch, all unlocked.
// Free forever from vøiddo — https://voiddo.com/tools/ctxstuff/

const { Command } = require('commander');
const pkg = require('../package.json');

const program = new Command();

program
  .name('ctxstuff')
  .description('Pack codebases into LLM-ready context. Free forever from vøiddo.')
  .version(`ctxstuff v${pkg.version} — vøiddo, free forever. https://voiddo.com/tools/ctxstuff/`, '-v, --version');

// ─── pack ──────────────────────────────────────────────────────────────────
program
  .command('pack [directory]')
  .description('Pack a directory into a single LLM context file')
  .option('-o, --output <file>', 'Output file')
  .option('-f, --format <format>', 'Output format: markdown, xml, plain, json', 'markdown')
  .option('-m, --model <model>', 'Model for token counting', 'gpt-5.4')
  .option('-e, --ext <extensions>', 'File extensions to include (comma-separated)')
  .option('-i, --ignore <patterns>', 'Patterns to ignore (comma-separated)')
  .option('--max-file-size <kb>', 'Max file size in KB', '1000')
  .option('--no-tree', 'Exclude file tree')
  .option('-c, --clipboard', 'Copy to clipboard')
  .option('-q, --quiet', 'Only output the packed content')
  .option('-s, --stats', 'Show detailed stats')
  .action(async (directory, options) => {
    const { execute } = require('../src/commands/pack');
    await execute(directory, options);
  });

// ─── count ─────────────────────────────────────────────────────────────────
program
  .command('count [target]')
  .description('Count tokens in a file or directory')
  .option('-m, --model <model>', 'Model for token counting', 'gpt-5.4')
  .option('-e, --ext <extensions>', 'File extensions to include')
  .option('-i, --ignore <patterns>', 'Patterns to ignore')
  .option('-b, --breakdown', 'Show per-file breakdown')
  .option('--models', 'List available models')
  .action(async (target, options) => {
    const { execute } = require('../src/commands/count');
    await execute(target, options);
  });

// ─── compare ───────────────────────────────────────────────────────────────
program
  .command('compare [target]')
  .description('Compare token counts across models')
  .option('-m, --models <models>', 'Models to compare (comma-separated)')
  .option('-e, --ext <extensions>', 'File extensions to include')
  .option('-i, --ignore <patterns>', 'Patterns to ignore')
  .action(async (target, options) => {
    const { execute } = require('../src/commands/compare');
    await execute(target, options);
  });

// ─── optimize ──────────────────────────────────────────────────────────────
program
  .command('optimize [directory]')
  .description('Optimize context to fit a token limit')
  .option('-t, --tokens <count>', 'Target token count')
  .option('-m, --model <model>', 'Target model', 'gpt-5.4')
  .option('-o, --output <file>', 'Output file')
  .option('-f, --format <format>', 'Output format', 'markdown')
  .option('-e, --ext <extensions>', 'File extensions to include')
  .option('-i, --ignore <patterns>', 'Patterns to ignore')
  .option('--keep-comments', 'Keep comments')
  .option('--keep-empty', 'Keep empty lines')
  .option('--minify', 'Minify code')
  .option('--no-tree', 'Exclude file tree')
  .option('-q, --quiet', 'Suppress output')
  .action(async (directory, options) => {
    const { execute } = require('../src/commands/optimize');
    await execute(directory, options);
  });

// ─── split ─────────────────────────────────────────────────────────────────
program
  .command('split [directory]')
  .description('Split context into chunks')
  .option('-s, --strategy <strategy>', 'Split strategy: by_tokens, by_files, by_directory, by_type', 'by_tokens')
  .option('-m, --model <model>', 'Target model', 'gpt-5.4')
  .option('--max-tokens <count>', 'Max tokens per chunk')
  .option('--max-files <count>', 'Max files per chunk')
  .option('-o, --output <dir>', 'Output directory for chunks')
  .option('-f, --format <format>', 'Output format', 'markdown')
  .option('-e, --ext <extensions>', 'File extensions to include')
  .option('-i, --ignore <patterns>', 'Patterns to ignore')
  .option('--overlap', 'Include overlapping files between chunks')
  .option('--overlap-files <count>', 'Number of overlap files', '2')
  .option('--suggest', 'Show split suggestions only')
  .option('-l, --list', 'List files in each chunk')
  .action(async (directory, options) => {
    const { execute } = require('../src/commands/split');
    await execute(directory, options);
  });

// ─── cost ──────────────────────────────────────────────────────────────────
program
  .command('cost [target]')
  .description('Estimate API costs across 60+ models')
  .option('-m, --model <model>', 'Model for cost calculation')
  .option('-o, --output <tokens>', 'Expected output tokens', '1000')
  .option('-c, --compare', 'Compare costs across models')
  .option('-e, --ext <extensions>', 'File extensions to include')
  .option('-i, --ignore <patterns>', 'Patterns to ignore')
  .action(async (target, options) => {
    const { execute } = require('../src/commands/cost');
    await execute(target, options);
  });

// ─── watch ─────────────────────────────────────────────────────────────────
program
  .command('watch [directory]')
  .description('Watch a directory and repack on changes')
  .option('-o, --output <file>', 'Output file')
  .option('-f, --format <format>', 'Output format', 'markdown')
  .option('-m, --model <model>', 'Model for token counting', 'gpt-5.4')
  .option('-e, --ext <extensions>', 'File extensions to include')
  .option('-i, --ignore <patterns>', 'Patterns to ignore')
  .option('-c, --clipboard', 'Copy to clipboard on change')
  .option('--debounce <ms>', 'Debounce time in ms', '1000')
  .option('--no-tree', 'Exclude file tree')
  .action(async (directory, options) => {
    const { execute } = require('../src/commands/watch');
    await execute(directory, options);
  });

// ─── profile ───────────────────────────────────────────────────────────────
program
  .command('profile [action]')
  .description('Manage custom model profiles (list, add, remove, show)')
  .option('-n, --name <name>', 'Profile name')
  .option('--context <tokens>', 'Context window size')
  .option('--input <price>', 'Input price per 1M tokens')
  .option('--output <price>', 'Output price per 1M tokens')
  .option('--tokenizer <name>', 'Tokenizer name', 'cl100k_base')
  .action(async (action, options) => {
    const { execute } = require('../src/commands/profile');
    await execute(action, options);
  });

// ─── help ──────────────────────────────────────────────────────────────────
program.addHelpText('after', `
Examples:
  $ ctxstuff pack ./my-project                    Pack a directory into markdown
  $ ctxstuff pack ./src -o context.md             Pack and save to file
  $ ctxstuff pack . --format xml -c               Pack as XML, copy to clipboard
  $ ctxstuff count ./src                          Count tokens across the tree
  $ ctxstuff count ./src --breakdown              Per-file token breakdown
  $ ctxstuff compare ./src                        Compare tokens across models
  $ ctxstuff optimize ./src --tokens 200000       Shrink to fit 200K tokens
  $ ctxstuff split ./large-repo -o ./chunks       Split into 1M-token chunks
  $ ctxstuff cost ./src --compare                 Compare API cost across models
  $ ctxstuff watch ./src -o context.md            Auto-repack on changes

Docs:    https://voiddo.com/tools/ctxstuff/
Issues:  https://github.com/voidd0/ctxstuff/issues
Contact: support@voiddo.com

Built by vøiddo — we write tools so you do not have to. Enjoy.
`);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

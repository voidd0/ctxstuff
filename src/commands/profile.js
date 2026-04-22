/**
 * Profile command (PRO only)
 * @module commands/profile
 *
 * Manage custom model profiles
 */

const { isPro } = require('../license/checker');
const { getCustomProfiles, saveCustomProfile, deleteCustomProfile } = require('../utils/config');
const { showProFeatureUpsell } = require('../utils/upsell');
const { colors, success, error, warning, header, separator, table } = require('../utils/output');
const { MODEL_PRICING } = require('../license/constants');

/**
 * Execute profile command
 * @param {string} action - Action: list, add, remove, show
 * @param {Object} options - Command options
 */
async function execute(action, options = {}) {
  // Check PRO status
  if (!isPro()) {
    showProFeatureUpsell('profile', `
Custom model profiles let you:
  • Add new models with custom pricing
  • Keep up-to-date with price changes
  • Configure custom context limits
  • Save preferred model settings

Stay current with evolving LLM pricing.
    `);
    process.exit(1);
  }

  switch (action) {
    case 'list':
    case 'ls':
    case undefined:
      listProfiles();
      break;
    case 'add':
    case 'create':
      addProfile(options);
      break;
    case 'remove':
    case 'rm':
    case 'delete':
      removeProfile(options);
      break;
    case 'show':
      showProfile(options);
      break;
    default:
      error(`Unknown action: ${action}`);
      console.log('');
      console.log('Available actions:');
      console.log('  list     - List all model profiles');
      console.log('  add      - Add a custom profile');
      console.log('  remove   - Remove a custom profile');
      console.log('  show     - Show profile details');
      process.exit(1);
  }
}

/**
 * List all profiles
 */
function listProfiles() {
  header('📋 Model Profiles');
  console.log('');

  // Built-in models
  console.log(colors.bold('Built-in models:'));
  console.log('');

  const builtinHeaders = ['Model', 'Context', 'Input $/1M', 'Output $/1M'];
  const builtinRows = Object.entries(MODEL_PRICING).map(([name, info]) => [
    name,
    info.context.toLocaleString(),
    info.input > 0 ? `$${info.input.toFixed(2)}` : 'free',
    info.output > 0 ? `$${info.output.toFixed(2)}` : 'free',
  ]);

  table(builtinHeaders, builtinRows);

  // Custom profiles
  const customProfiles = getCustomProfiles();
  const customNames = Object.keys(customProfiles);

  if (customNames.length > 0) {
    console.log('');
    console.log(colors.bold('Custom profiles:'));
    console.log('');

    const customRows = customNames.map(name => {
      const p = customProfiles[name];
      return [
        colors.accent(name),
        p.context.toLocaleString(),
        p.input > 0 ? `$${p.input.toFixed(2)}` : 'free',
        p.output > 0 ? `$${p.output.toFixed(2)}` : 'free',
      ];
    });

    table(builtinHeaders, customRows);
  }

  console.log('');
  console.log(colors.dim('Use: ctxstuff profile add --name <name> --context <tokens> --input <price> --output <price>'));
}

/**
 * Add a custom profile
 */
function addProfile(options) {
  const { name, context, input, output } = options;

  if (!name) {
    error('Profile name is required (--name)');
    process.exit(1);
  }

  if (!context) {
    error('Context size is required (--context)');
    process.exit(1);
  }

  // Check if overwriting built-in
  if (MODEL_PRICING[name]) {
    warning(`Note: This will shadow the built-in '${name}' profile`);
  }

  const profile = {
    context: parseInt(context),
    input: parseFloat(input || 0),
    output: parseFloat(output || 0),
    tokenizer: options.tokenizer || 'cl100k_base',
    createdAt: new Date().toISOString(),
  };

  saveCustomProfile(name, profile);
  success(`Profile '${name}' created`);

  console.log('');
  console.log(`  Context: ${profile.context.toLocaleString()} tokens`);
  console.log(`  Input:   $${profile.input.toFixed(2)} / 1M tokens`);
  console.log(`  Output:  $${profile.output.toFixed(2)} / 1M tokens`);
}

/**
 * Remove a custom profile
 */
function removeProfile(options) {
  const { name } = options;

  if (!name) {
    error('Profile name is required (--name)');
    process.exit(1);
  }

  const profiles = getCustomProfiles();

  if (!profiles[name]) {
    error(`Profile '${name}' not found`);
    process.exit(1);
  }

  if (MODEL_PRICING[name]) {
    error(`Cannot remove built-in profile '${name}'`);
    process.exit(1);
  }

  deleteCustomProfile(name);
  success(`Profile '${name}' removed`);
}

/**
 * Show profile details
 */
function showProfile(options) {
  const { name } = options;

  if (!name) {
    error('Profile name is required (--name)');
    process.exit(1);
  }

  const customProfiles = getCustomProfiles();
  const profile = customProfiles[name] || MODEL_PRICING[name];

  if (!profile) {
    error(`Profile '${name}' not found`);
    process.exit(1);
  }

  const isBuiltin = !!MODEL_PRICING[name] && !customProfiles[name];

  header(`📋 Profile: ${name}`);
  console.log('');

  console.log(`  ${colors.dim('Type:')}      ${isBuiltin ? 'Built-in' : colors.accent('Custom')}`);
  console.log(`  ${colors.dim('Context:')}   ${profile.context.toLocaleString()} tokens`);
  console.log(`  ${colors.dim('Input:')}     $${profile.input.toFixed(2)} / 1M tokens`);
  console.log(`  ${colors.dim('Output:')}    $${profile.output.toFixed(2)} / 1M tokens`);
  console.log(`  ${colors.dim('Tokenizer:')} ${profile.tokenizer || 'cl100k_base'}`);

  if (profile.createdAt) {
    console.log(`  ${colors.dim('Created:')}   ${new Date(profile.createdAt).toLocaleDateString()}`);
  }

  // Calculate example costs
  console.log('');
  separator();
  console.log('');
  console.log(colors.bold('Example costs:'));

  const examples = [
    { tokens: 1000, label: '1K tokens' },
    { tokens: 10000, label: '10K tokens' },
    { tokens: 50000, label: '50K tokens' },
    { tokens: 100000, label: '100K tokens' },
  ];

  examples.forEach(ex => {
    if (ex.tokens <= profile.context) {
      const inputCost = (ex.tokens / 1_000_000) * profile.input;
      const outputCost = (ex.tokens / 1_000_000) * profile.output;
      console.log(`  ${ex.label}: $${(inputCost + outputCost).toFixed(4)} (in: $${inputCost.toFixed(4)}, out: $${outputCost.toFixed(4)})`);
    }
  });
}

module.exports = { execute };

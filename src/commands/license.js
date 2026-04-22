/**
 * License command
 * @module commands/license
 *
 * Manage PRO license
 */

const { activateLicense, deactivateLicense, getLicenseStatus, isPro } = require('../license/checker');
const { getLimitStatus } = require('../license/limits');
const { colors, success, error, header, separator } = require('../utils/output');
const { PRO_PRICE, PRO_URL, FREE_LIMITS } = require('../license/constants');

/**
 * Execute license command
 * @param {string} action - Action: status, activate, deactivate
 * @param {Object} options - Command options
 */
async function execute(action, options = {}) {
  switch (action) {
    case 'status':
    case undefined:
      showStatus();
      break;
    case 'activate':
      activate(options);
      break;
    case 'deactivate':
      deactivate();
      break;
    case 'buy':
    case 'purchase':
      showBuyInfo();
      break;
    default:
      error(`Unknown action: ${action}`);
      console.log('');
      console.log('Available actions:');
      console.log('  status      - Show license status');
      console.log('  activate    - Activate license key');
      console.log('  deactivate  - Remove license');
      console.log('  buy         - Show purchase info');
      process.exit(1);
  }
}

/**
 * Show license status
 */
function showStatus() {
  const status = getLicenseStatus();
  const limits = getLimitStatus();

  if (status.tier === 'pro') {
    header('💎 ctxstuff PRO');
    console.log('');
    console.log(colors.success('  License: Active'));
    console.log(`  Key:     ${status.key}`);
    console.log(`  Since:   ${new Date(status.activatedAt).toLocaleDateString()}`);
    console.log('');
    console.log(colors.dim('  All features unlocked'));
    console.log(colors.dim('  Unlimited operations'));
    console.log(colors.dim('  Accurate token counting'));
  } else {
    header('⚡ ctxstuff FREE');
    console.log('');
    console.log(`  ${colors.dim('Operations:')}  ${limits.opsToday}/${limits.opsLimit} today`);
    console.log(`  ${colors.dim('Max files:')}   ${limits.maxFiles}`);
    console.log(`  ${colors.dim('Max size:')}    ${Math.round(limits.maxSize / 1024)} KB`);
    console.log('');

    separator();
    console.log('');
    console.log(colors.pro('💎 Upgrade to PRO:'));
    console.log('');
    console.log('  ✓ Unlimited operations');
    console.log('  ✓ Accurate tiktoken counting');
    console.log('  ✓ Context optimization');
    console.log('  ✓ Context splitting');
    console.log('  ✓ Cost estimation');
    console.log('  ✓ File watching');
    console.log('  ✓ Custom model profiles');
    console.log('  ✓ .ctxignore support');
    console.log('');
    console.log(`  ${colors.price(PRO_PRICE + ' one-time')} → ${PRO_URL}`);
  }
}

/**
 * Activate license
 */
function activate(options) {
  const key = options.key || options._[0];

  if (!key) {
    error('License key is required');
    console.log('');
    console.log('Usage: ctxstuff license activate --key CTX-XXXX-XXXX-XXXX-XXXX');
    console.log(`       or: ctxstuff license activate CTX-XXXX-XXXX-XXXX-XXXX`);
    console.log('');
    console.log(`Get your key at: ${PRO_URL}`);
    process.exit(1);
  }

  const result = activateLicense(key);

  if (result.success) {
    console.log('');
    success('License activated successfully!');
    console.log('');
    console.log(colors.pro('💎 Welcome to ctxstuff PRO!'));
    console.log('');
    console.log('  All features are now unlocked:');
    console.log('  • Unlimited operations');
    console.log('  • Accurate token counting');
    console.log('  • optimize, split, cost, watch, profile commands');
    console.log('');
    console.log(colors.dim('  Thank you for your support!'));
  } else {
    error(result.error);
    console.log('');
    console.log('If you believe this is an error, contact support@voiddo.com');
    process.exit(1);
  }
}

/**
 * Deactivate license
 */
function deactivate() {
  const result = deactivateLicense();

  if (result.success) {
    success('License deactivated');
    console.log('');
    console.log(colors.dim('You can reactivate anytime with your license key.'));
  } else {
    error(result.error);
    process.exit(1);
  }
}

/**
 * Show purchase info
 */
function showBuyInfo() {
  header('💎 Get ctxstuff PRO');
  console.log('');
  console.log(colors.bold('PRO Features:'));
  console.log('');
  console.log('  ✓ Unlimited operations (FREE: 10/day)');
  console.log('  ✓ Unlimited files (FREE: 20 max)');
  console.log('  ✓ Unlimited size (FREE: 500KB max)');
  console.log('  ✓ Accurate tiktoken counting');
  console.log('  ✓ optimize - Fit context to any limit');
  console.log('  ✓ split - Divide large codebases');
  console.log('  ✓ cost - Estimate API costs');
  console.log('  ✓ watch - Auto-repack on changes');
  console.log('  ✓ profile - Custom model profiles');
  console.log('  ✓ .ctxignore file support');
  console.log('');
  separator();
  console.log('');
  console.log(`  ${colors.price(PRO_PRICE)} one-time payment`);
  console.log(`  No subscription, yours forever`);
  console.log('');
  console.log(`  → ${colors.bold(PRO_URL)}`);
  console.log('');
  separator();
  console.log('');
  console.log(colors.dim('After purchase, activate with:'));
  console.log(colors.dim('  ctxstuff license activate --key YOUR-KEY'));
}

module.exports = { execute };

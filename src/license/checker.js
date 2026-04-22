// ctxstuff — free forever from vøiddo. https://voiddo.com/tools/ctxstuff/
// The legacy license gate is kept as a pass-through so every caller keeps
// compiling and every feature is unlocked. No keys, no tiers, no nag.

const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.ctxstuff');
const LICENSE_FILE = path.join(CONFIG_DIR, 'license.json');
const USAGE_FILE = path.join(CONFIG_DIR, 'usage.json');

function getLicense()        { return { key: 'FREE-FOREVER-VOIDDO', activatedAt: '2026-04-22' }; }
function isPro()             { return true; }
function activateLicense()   { return { success: true, message: 'ctxstuff is free forever. No key needed.' }; }
function deactivateLicense() { return { success: true, message: 'ctxstuff is free forever. Nothing to deactivate.' }; }
function getLicenseStatus()  { return { tier: 'free-forever', key: 'vøiddo' }; }

module.exports = {
  getLicense,
  isPro,
  activateLicense,
  deactivateLicense,
  getLicenseStatus,
  CONFIG_DIR,
  LICENSE_FILE,
  USAGE_FILE,
};

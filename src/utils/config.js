/**
 * Configuration utilities
 * @module utils/config
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.ctxstuff');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const PROFILES_FILE = path.join(CONFIG_DIR, 'profiles.json');

const DEFAULT_CONFIG = {
  defaultModel: 'gpt-5-turbo',
  defaultFormat: 'markdown',
  showTree: true,
  showTokens: false,
};

/**
 * Ensure config directory exists
 */
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Get config
 * @returns {Object}
 */
function getConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG };
    const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    return { ...DEFAULT_CONFIG, ...data };
  } catch (e) {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save config
 * @param {Object} config
 */
function saveConfig(config) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Set config value
 * @param {string} key
 * @param {any} value
 */
function setConfigValue(key, value) {
  const config = getConfig();
  config[key] = value;
  saveConfig(config);
}

/**
 * Get custom model profiles
 * @returns {Object}
 */
function getCustomProfiles() {
  try {
    if (!fs.existsSync(PROFILES_FILE)) return {};
    return JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

/**
 * Save custom model profile
 * @param {string} name - Profile name
 * @param {Object} profile - Profile data
 */
function saveCustomProfile(name, profile) {
  ensureConfigDir();
  const profiles = getCustomProfiles();
  profiles[name] = profile;
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));
}

/**
 * Delete custom profile
 * @param {string} name
 */
function deleteCustomProfile(name) {
  const profiles = getCustomProfiles();
  delete profiles[name];
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));
}

/**
 * Load .ctxignore file
 * @param {string} dir - Directory to look in
 * @returns {string[]} - Array of patterns to ignore
 */
function loadCtxignore(dir) {
  const ctxignorePath = path.join(dir, '.ctxignore');
  if (!fs.existsSync(ctxignorePath)) return [];

  const content = fs.readFileSync(ctxignorePath, 'utf8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

module.exports = {
  getConfig,
  saveConfig,
  setConfigValue,
  getCustomProfiles,
  saveCustomProfile,
  deleteCustomProfile,
  loadCtxignore,
  CONFIG_DIR,
};

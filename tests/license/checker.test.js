/**
 * Tests for license/checker module
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Import the actual module - tests will use real paths
const {
  getLicense,
  isPro,
  activateLicense,
  deactivateLicense,
  getLicenseStatus,
  CONFIG_DIR,
  LICENSE_FILE,
} = require('../../src/license/checker');

// Backup original license if exists
let originalLicenseData = null;

beforeAll(() => {
  // Backup existing license
  if (fs.existsSync(LICENSE_FILE)) {
    originalLicenseData = fs.readFileSync(LICENSE_FILE, 'utf8');
  }
});

beforeEach(() => {
  // Clean up license file before each test
  if (fs.existsSync(LICENSE_FILE)) {
    fs.unlinkSync(LICENSE_FILE);
  }
});

afterAll(() => {
  // Restore original license if it existed
  if (originalLicenseData) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(LICENSE_FILE, originalLicenseData);
  } else if (fs.existsSync(LICENSE_FILE)) {
    fs.unlinkSync(LICENSE_FILE);
  }
});

describe('getLicense', () => {
  test('should return null when no license file exists', () => {
    expect(getLicense()).toBeNull();
  });

  test('should return null for invalid license data', () => {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(LICENSE_FILE, JSON.stringify({ key: 'invalid' }));
    expect(getLicense()).toBeNull();
  });

  test('should return license data for valid license', () => {
    const keyBody = 'CTX-AAAA-BBBB-CCCC';
    const checksum = crypto.createHash('md5').update(keyBody).digest('hex').slice(0, 4).toUpperCase();
    const validKey = `${keyBody}-${checksum}`;

    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(LICENSE_FILE, JSON.stringify({
      key: validKey,
      activatedAt: new Date().toISOString(),
    }));

    const license = getLicense();
    expect(license).not.toBeNull();
    expect(license.key).toBe(validKey);
  });

  test('should return null for expired license', () => {
    const keyBody = 'CTX-AAAA-BBBB-CCCC';
    const checksum = crypto.createHash('md5').update(keyBody).digest('hex').slice(0, 4).toUpperCase();
    const validKey = `${keyBody}-${checksum}`;

    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(LICENSE_FILE, JSON.stringify({
      key: validKey,
      activatedAt: new Date().toISOString(),
      expiresAt: new Date('2020-01-01').toISOString(), // Past date
    }));

    expect(getLicense()).toBeNull();
  });
});

describe('isPro', () => {
  test('should return false when no license', () => {
    expect(isPro()).toBe(false);
  });

  test('should return true when valid license exists', () => {
    const keyBody = 'CTX-TEST-ABCD-EFGH';
    const checksum = crypto.createHash('md5').update(keyBody).digest('hex').slice(0, 4).toUpperCase();
    const validKey = `${keyBody}-${checksum}`;

    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(LICENSE_FILE, JSON.stringify({
      key: validKey,
      activatedAt: new Date().toISOString(),
    }));

    expect(isPro()).toBe(true);
  });
});

describe('activateLicense', () => {
  test('should reject empty key', () => {
    const result = activateLicense('');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid');
  });

  test('should reject key without CTX- prefix', () => {
    const result = activateLicense('ABCD-1234-5678-9012');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid');
  });

  test('should reject key with wrong format', () => {
    const result = activateLicense('CTX-INVALID');
    expect(result.success).toBe(false);
  });

  test('should reject key with invalid checksum', () => {
    const result = activateLicense('CTX-AAAA-BBBB-CCCC-XXXX');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid');
  });

  test('should accept valid key', () => {
    const keyBody = 'CTX-PROD-XXXX-YYYY';
    const checksum = crypto.createHash('md5').update(keyBody).digest('hex').slice(0, 4).toUpperCase();
    const validKey = `${keyBody}-${checksum}`;

    const result = activateLicense(validKey);
    expect(result.success).toBe(true);
    expect(result.message).toContain('success');
  });

  test('should create license file on success', () => {
    const keyBody = 'CTX-FILE-TEST-AAAA';
    const checksum = crypto.createHash('md5').update(keyBody).digest('hex').slice(0, 4).toUpperCase();
    const validKey = `${keyBody}-${checksum}`;

    activateLicense(validKey);
    expect(fs.existsSync(LICENSE_FILE)).toBe(true);
  });
});

describe('deactivateLicense', () => {
  test('should return error when no license exists', () => {
    const result = deactivateLicense();
    expect(result.success).toBe(false);
    expect(result.error).toContain('No active license');
  });

  test('should remove license file', () => {
    // First activate a license
    const keyBody = 'CTX-DEAC-TEST-AAAA';
    const checksum = crypto.createHash('md5').update(keyBody).digest('hex').slice(0, 4).toUpperCase();
    const validKey = `${keyBody}-${checksum}`;
    activateLicense(validKey);

    // Then deactivate
    const result = deactivateLicense();
    expect(result.success).toBe(true);
    expect(fs.existsSync(LICENSE_FILE)).toBe(false);
  });
});

describe('getLicenseStatus', () => {
  test('should return free tier when no license', () => {
    const status = getLicenseStatus();
    expect(status.tier).toBe('free');
  });

  test('should return pro tier when licensed', () => {
    const keyBody = 'CTX-STAT-TEST-AAAA';
    const checksum = crypto.createHash('md5').update(keyBody).digest('hex').slice(0, 4).toUpperCase();
    const validKey = `${keyBody}-${checksum}`;
    activateLicense(validKey);

    const status = getLicenseStatus();
    expect(status.tier).toBe('pro');
    expect(status.key).toBeDefined();
    expect(status.activatedAt).toBeDefined();
  });

  test('should mask license key in status', () => {
    const keyBody = 'CTX-MASK-TEST-ABCD';
    const checksum = crypto.createHash('md5').update(keyBody).digest('hex').slice(0, 4).toUpperCase();
    const validKey = `${keyBody}-${checksum}`;
    activateLicense(validKey);

    const status = getLicenseStatus();
    expect(status.key).toContain('****');
    expect(status.key).not.toBe(validKey);
  });
});

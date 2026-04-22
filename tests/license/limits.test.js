/**
 * Tests for license/limits module
 */

const { FREE_LIMITS } = require('../../src/license/constants');

// Mock isPro to test FREE tier limits
jest.mock('../../src/license/checker', () => ({
  isPro: jest.fn(() => false),
  CONFIG_DIR: '/tmp/ctxstuff-limits-test',
  USAGE_FILE: '/tmp/ctxstuff-limits-test/usage.json',
}));

// Import after mocking
const {
  getRemainingOps,
  getCurrentOps,
  canOperate,
  checkFileLimit,
  checkSizeLimit,
  getLimitStatus,
} = require('../../src/license/limits');
const { isPro } = require('../../src/license/checker');

describe('FREE_LIMITS', () => {
  test('should have ops per day limit', () => {
    expect(FREE_LIMITS.opsPerDay).toBe(10);
  });

  test('should have max files limit', () => {
    expect(FREE_LIMITS.maxFiles).toBe(20);
  });

  test('should have max total size limit', () => {
    expect(FREE_LIMITS.maxTotalSize).toBe(500 * 1024);
  });
});

describe('getRemainingOps', () => {
  beforeEach(() => {
    isPro.mockReturnValue(false);
  });

  test('should return remaining ops for free tier', () => {
    const remaining = getRemainingOps();
    expect(typeof remaining).toBe('number');
    expect(remaining).toBeGreaterThanOrEqual(0);
  });

  test('should return Infinity for pro tier', () => {
    isPro.mockReturnValue(true);
    const remaining = getRemainingOps();
    expect(remaining).toBe(Infinity);
  });
});

describe('getCurrentOps', () => {
  test('should return number', () => {
    const ops = getCurrentOps();
    expect(typeof ops).toBe('number');
    expect(ops).toBeGreaterThanOrEqual(0);
  });
});

describe('canOperate', () => {
  beforeEach(() => {
    isPro.mockReturnValue(false);
  });

  test('should return object with allowed property', () => {
    const result = canOperate();
    expect(result).toHaveProperty('allowed');
    expect(typeof result.allowed).toBe('boolean');
  });

  test('should always allow for pro tier', () => {
    isPro.mockReturnValue(true);
    const result = canOperate();
    expect(result.allowed).toBe(true);
  });
});

describe('checkFileLimit', () => {
  beforeEach(() => {
    isPro.mockReturnValue(false);
  });

  test('should allow files under limit', () => {
    const result = checkFileLimit(10);
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(10);
  });

  test('should reject files over limit for free tier', () => {
    const result = checkFileLimit(100);
    expect(result.allowed).toBe(false);
    expect(result.count).toBe(FREE_LIMITS.maxFiles);
    expect(result.reason).toBeDefined();
  });

  test('should allow any file count for pro tier', () => {
    isPro.mockReturnValue(true);
    const result = checkFileLimit(1000);
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(1000);
  });

  test('should return exact count at limit', () => {
    const result = checkFileLimit(FREE_LIMITS.maxFiles);
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(FREE_LIMITS.maxFiles);
  });
});

describe('checkSizeLimit', () => {
  beforeEach(() => {
    isPro.mockReturnValue(false);
  });

  test('should allow size under limit', () => {
    const result = checkSizeLimit(100 * 1024); // 100KB
    expect(result.allowed).toBe(true);
    expect(result.size).toBe(100 * 1024);
  });

  test('should reject size over limit for free tier', () => {
    const result = checkSizeLimit(1024 * 1024); // 1MB
    expect(result.allowed).toBe(false);
    expect(result.size).toBe(FREE_LIMITS.maxTotalSize);
    expect(result.reason).toBeDefined();
  });

  test('should allow any size for pro tier', () => {
    isPro.mockReturnValue(true);
    const result = checkSizeLimit(10 * 1024 * 1024); // 10MB
    expect(result.allowed).toBe(true);
    expect(result.size).toBe(10 * 1024 * 1024);
  });

  test('should allow exact limit', () => {
    const result = checkSizeLimit(FREE_LIMITS.maxTotalSize);
    expect(result.allowed).toBe(true);
  });
});

describe('getLimitStatus', () => {
  beforeEach(() => {
    isPro.mockReturnValue(false);
  });

  test('should return free tier status', () => {
    const status = getLimitStatus();
    expect(status.tier).toBe('free');
    expect(status.unlimited).toBe(false);
    expect(status.opsLimit).toBe(FREE_LIMITS.opsPerDay);
    expect(status.maxFiles).toBe(FREE_LIMITS.maxFiles);
    expect(status.maxSize).toBe(FREE_LIMITS.maxTotalSize);
  });

  test('should return pro tier status', () => {
    isPro.mockReturnValue(true);
    const status = getLimitStatus();
    expect(status.tier).toBe('pro');
    expect(status.unlimited).toBe(true);
  });

  test('should include current ops count for free tier', () => {
    const status = getLimitStatus();
    expect(status).toHaveProperty('opsToday');
    expect(typeof status.opsToday).toBe('number');
  });
});

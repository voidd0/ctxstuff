/**
 * Tests for utils/output module
 */

const {
  colors,
  formatBytes,
  formatNumber,
  formatMoney,
  proBadge,
  version,
} = require('../../src/utils/output');

describe('colors', () => {
  test('should have success color', () => {
    expect(colors.success).toBeDefined();
    expect(typeof colors.success).toBe('function');
  });

  test('should have error color', () => {
    expect(colors.error).toBeDefined();
    expect(typeof colors.error).toBe('function');
  });

  test('should have warning color', () => {
    expect(colors.warning).toBeDefined();
  });

  test('should have info color', () => {
    expect(colors.info).toBeDefined();
  });

  test('should have dim color', () => {
    expect(colors.dim).toBeDefined();
  });

  test('should have bold color', () => {
    expect(colors.bold).toBeDefined();
  });

  test('should have pro color', () => {
    expect(colors.pro).toBeDefined();
  });

  test('should have price color', () => {
    expect(colors.price).toBeDefined();
  });

  test('colors should return strings', () => {
    const result = colors.success('test');
    expect(typeof result).toBe('string');
  });
});

describe('formatBytes', () => {
  test('should format bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  test('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  test('should format megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MB');
  });

  test('should handle zero', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  test('should handle fractional KB', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });
});

describe('formatNumber', () => {
  test('should format small numbers', () => {
    const result = formatNumber(100);
    expect(result).toContain('100');
  });

  test('should add thousand separators', () => {
    const result = formatNumber(1000);
    expect(result).toMatch(/1[,.]?000/); // Allow for locale differences
  });

  test('should handle large numbers', () => {
    const result = formatNumber(1000000);
    expect(result).toMatch(/1[,.]?000[,.]?000/);
  });

  test('should handle zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

describe('formatMoney', () => {
  test('should format with dollar sign', () => {
    const result = formatMoney(10);
    expect(result).toBe('$10.00');
  });

  test('should format cents', () => {
    const result = formatMoney(10.5);
    expect(result).toBe('$10.50');
  });

  test('should format small amounts', () => {
    const result = formatMoney(0.05);
    expect(result).toBe('$0.05');
  });

  test('should handle zero', () => {
    const result = formatMoney(0);
    expect(result).toBe('$0.00');
  });

  test('should round to 2 decimal places', () => {
    const result = formatMoney(10.999);
    expect(result).toBe('$11.00');
  });
});

describe('proBadge', () => {
  test('should return string', () => {
    const result = proBadge();
    expect(typeof result).toBe('string');
  });

  test('should contain PRO', () => {
    const result = proBadge();
    expect(result).toContain('PRO');
  });
});

describe('version', () => {
  test('should format version string', () => {
    const result = version('1.0.0', 'free');
    expect(result).toContain('ctxstuff');
    expect(result).toContain('1.0.0');
  });

  test('should indicate free tier', () => {
    const result = version('1.0.0', 'free');
    expect(result).toContain('FREE');
  });

  test('should indicate pro tier', () => {
    const result = version('1.0.0', 'pro');
    expect(result).toContain('PRO');
  });
});

/**
 * Tests for license/constants module
 */

const {
  PRO_PRICE,
  PRO_URL,
  FREE_LIMITS,
  MODEL_PRICING,
  DEFAULT_MODEL,
  CROSS_PROMO,
} = require('../../src/license/constants');

describe('PRO_PRICE', () => {
  test('should be defined', () => {
    expect(PRO_PRICE).toBeDefined();
  });

  test('should be a price string', () => {
    expect(PRO_PRICE).toMatch(/\$\d+\.\d{2}/);
  });

  test('should be $14.99', () => {
    expect(PRO_PRICE).toBe('$14.99');
  });
});

describe('PRO_URL', () => {
  test('should be defined', () => {
    expect(PRO_URL).toBeDefined();
  });

  test('should be a URL', () => {
    expect(PRO_URL).toMatch(/^https?:\/\//);
  });

  test('should contain pnkd.dev', () => {
    expect(PRO_URL).toContain('pnkd.dev');
  });
});

describe('FREE_LIMITS', () => {
  test('should have opsPerDay', () => {
    expect(FREE_LIMITS.opsPerDay).toBeDefined();
    expect(typeof FREE_LIMITS.opsPerDay).toBe('number');
    expect(FREE_LIMITS.opsPerDay).toBeGreaterThan(0);
  });

  test('should have maxFiles', () => {
    expect(FREE_LIMITS.maxFiles).toBeDefined();
    expect(typeof FREE_LIMITS.maxFiles).toBe('number');
    expect(FREE_LIMITS.maxFiles).toBeGreaterThan(0);
  });

  test('should have maxTotalSize', () => {
    expect(FREE_LIMITS.maxTotalSize).toBeDefined();
    expect(typeof FREE_LIMITS.maxTotalSize).toBe('number');
    expect(FREE_LIMITS.maxTotalSize).toBeGreaterThan(0);
  });

  test('should have reasonable limits', () => {
    expect(FREE_LIMITS.opsPerDay).toBe(10);
    expect(FREE_LIMITS.maxFiles).toBe(20);
    expect(FREE_LIMITS.maxTotalSize).toBe(500 * 1024);
  });
});

describe('MODEL_PRICING', () => {
  test('should be defined', () => {
    expect(MODEL_PRICING).toBeDefined();
  });

  test('should have GPT-5 models', () => {
    expect(MODEL_PRICING['gpt-5']).toBeDefined();
    expect(MODEL_PRICING['gpt-5-turbo']).toBeDefined();
    expect(MODEL_PRICING['gpt-4.5-turbo']).toBeDefined();
  });

  test('should have Claude models', () => {
    expect(MODEL_PRICING['claude-5']).toBeDefined();
    expect(MODEL_PRICING['claude-4.5-opus']).toBeDefined();
    expect(MODEL_PRICING['claude-4.5-sonnet']).toBeDefined();
    expect(MODEL_PRICING['claude-4.5-haiku']).toBeDefined();
  });

  test('should have Llama models', () => {
    expect(MODEL_PRICING['llama-4']).toBeDefined();
    expect(MODEL_PRICING['llama-4-large']).toBeDefined();
  });

  test('models should have required properties', () => {
    Object.values(MODEL_PRICING).forEach(model => {
      expect(model).toHaveProperty('context');
      expect(model).toHaveProperty('input');
      expect(model).toHaveProperty('output');
      expect(model).toHaveProperty('tokenizer');
    });
  });

  test('context sizes should be positive', () => {
    Object.values(MODEL_PRICING).forEach(model => {
      expect(model.context).toBeGreaterThan(0);
    });
  });

  test('prices should be non-negative', () => {
    Object.values(MODEL_PRICING).forEach(model => {
      expect(model.input).toBeGreaterThanOrEqual(0);
      expect(model.output).toBeGreaterThanOrEqual(0);
    });
  });

  test('GPT-5-turbo should have correct context', () => {
    expect(MODEL_PRICING['gpt-5-turbo'].context).toBe(128000);
  });

  test('Claude-5 should have 500K context', () => {
    expect(MODEL_PRICING['claude-5'].context).toBe(500000);
  });
});

describe('DEFAULT_MODEL', () => {
  test('should be defined', () => {
    expect(DEFAULT_MODEL).toBeDefined();
  });

  test('should be gpt-5-turbo', () => {
    expect(DEFAULT_MODEL).toBe('gpt-5-turbo');
  });

  test('should exist in MODEL_PRICING', () => {
    expect(MODEL_PRICING[DEFAULT_MODEL]).toBeDefined();
  });
});

describe('CROSS_PROMO', () => {
  test('should be defined', () => {
    expect(CROSS_PROMO).toBeDefined();
  });

  test('should have llmcache', () => {
    expect(CROSS_PROMO.llmcache).toBeDefined();
    expect(CROSS_PROMO.llmcache.name).toContain('llmcache');
    expect(CROSS_PROMO.llmcache.price).toMatch(/\$/);
    expect(CROSS_PROMO.llmcache.url).toMatch(/^https?:\/\//);
  });

  test('should have aiproxy', () => {
    expect(CROSS_PROMO.aiproxy).toBeDefined();
    expect(CROSS_PROMO.aiproxy.name).toContain('aiproxy');
    expect(CROSS_PROMO.aiproxy.price).toMatch(/\$/);
    expect(CROSS_PROMO.aiproxy.url).toMatch(/^https?:\/\//);
  });

  test('products should have descriptions', () => {
    Object.values(CROSS_PROMO).forEach(product => {
      expect(product.desc).toBeDefined();
      expect(product.desc.length).toBeGreaterThan(0);
    });
  });
});

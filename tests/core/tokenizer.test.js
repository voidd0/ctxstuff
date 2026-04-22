/**
 * Tests for core/tokenizer module
 */

const {
  estimateTokens,
  countTokens,
  countFilesTokens,
  getModelInfo,
  calculateCost,
  listModels,
  hasTiktoken,
  DEFAULT_MODEL,
} = require('../../src/core/tokenizer');

describe('estimateTokens', () => {
  test('should return 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  test('should return 0 for null/undefined', () => {
    expect(estimateTokens(null)).toBe(0);
    expect(estimateTokens(undefined)).toBe(0);
  });

  test('should estimate ~4 chars per token', () => {
    const text = 'Hello World'; // 11 chars
    const tokens = estimateTokens(text);
    expect(tokens).toBe(3); // ceil(11/4) = 3
  });

  test('should handle long text', () => {
    const text = 'a'.repeat(1000);
    const tokens = estimateTokens(text);
    expect(tokens).toBe(250); // 1000/4
  });

  test('should handle unicode', () => {
    const text = 'Hello 世界 🌍';
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(0);
  });
});

describe('countTokens', () => {
  test('should return token count object', () => {
    const result = countTokens('Hello World');
    expect(result).toHaveProperty('tokens');
    expect(result).toHaveProperty('accurate');
    expect(result).toHaveProperty('model');
  });

  test('should use estimate for FREE tier', () => {
    const result = countTokens('Hello World');
    expect(result.tokens).toBeGreaterThan(0);
    // In FREE mode without tiktoken, accurate should be false
  });

  test('should use default model', () => {
    const result = countTokens('Hello World');
    expect(result.model).toBe(DEFAULT_MODEL);
  });

  test('should accept custom model', () => {
    const result = countTokens('Hello World', 'gpt-5-turbo');
    expect(result.model).toBe('gpt-5-turbo');
  });

  test('should handle empty text', () => {
    const result = countTokens('');
    expect(result.tokens).toBe(0);
  });
});

describe('countFilesTokens', () => {
  test('should count tokens for multiple files', () => {
    const files = [
      { path: 'file1.js', content: 'const a = 1;' },
      { path: 'file2.js', content: 'const b = 2;' },
    ];
    const result = countFilesTokens(files);

    expect(result.totalTokens).toBeGreaterThan(0);
    expect(result.fileTokens).toHaveLength(2);
  });

  test('should include per-file token counts', () => {
    const files = [
      { path: 'file1.js', content: 'const a = 1;' },
    ];
    const result = countFilesTokens(files);

    expect(result.fileTokens[0]).toHaveProperty('path', 'file1.js');
    expect(result.fileTokens[0]).toHaveProperty('tokens');
    expect(result.fileTokens[0]).toHaveProperty('size');
  });

  test('should handle empty files array', () => {
    const result = countFilesTokens([]);
    expect(result.totalTokens).toBe(0);
    expect(result.fileTokens).toHaveLength(0);
  });

  test('should handle files without content', () => {
    const files = [
      { path: 'file1.js' },
    ];
    const result = countFilesTokens(files);
    expect(result.totalTokens).toBe(0);
  });
});

describe('getModelInfo', () => {
  test('should return info for known model', () => {
    const info = getModelInfo('gpt-5-turbo');
    expect(info.known).toBe(true);
    expect(info.context).toBe(128000);
    expect(info.pricing).toBeDefined();
  });

  test('should return unknown for unsupported model', () => {
    const info = getModelInfo('unknown-model');
    expect(info.known).toBe(false);
    expect(info.context).toBe(null);
  });

  test('should include pricing info', () => {
    const info = getModelInfo('gpt-5');
    expect(info.pricing.input).toBeGreaterThan(0);
    expect(info.pricing.output).toBeGreaterThan(0);
  });

  test('should include tokenizer info', () => {
    const info = getModelInfo('gpt-5-turbo');
    expect(info.tokenizer).toBe('cl100k_base');
  });
});

describe('calculateCost', () => {
  test('should calculate cost for input tokens', () => {
    const cost = calculateCost(1000000, 0, 'gpt-5-turbo'); // 1M tokens
    expect(cost.inputCost).toBe(5.00); // $5 per 1M input
    expect(cost.outputCost).toBe(0);
    expect(cost.totalCost).toBe(5.00);
  });

  test('should calculate cost for output tokens', () => {
    const cost = calculateCost(0, 1000000, 'gpt-5-turbo'); // 1M output tokens
    expect(cost.outputCost).toBe(15.00); // $15 per 1M output
  });

  test('should calculate combined cost', () => {
    const cost = calculateCost(500000, 500000, 'gpt-5-turbo');
    expect(cost.inputCost).toBe(2.50);
    expect(cost.outputCost).toBe(7.50);
    expect(cost.totalCost).toBe(10.00);
  });

  test('should return error for unknown model', () => {
    const cost = calculateCost(1000, 0, 'unknown-model');
    expect(cost.error).toBeDefined();
  });

  test('should calculate context usage', () => {
    const cost = calculateCost(64000, 0, 'gpt-5-turbo'); // Half of 128K context
    expect(cost.contextUsage).toBe(0.5);
    expect(cost.contextRemaining).toBe(64000);
  });

  test('should handle zero tokens', () => {
    const cost = calculateCost(0, 0, 'gpt-5-turbo');
    expect(cost.totalCost).toBe(0);
  });
});

describe('listModels', () => {
  test('should return array of models', () => {
    const models = listModels();
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
  });

  test('should include model properties', () => {
    const models = listModels();
    models.forEach(m => {
      expect(m).toHaveProperty('name');
      expect(m).toHaveProperty('context');
      expect(m).toHaveProperty('inputPrice');
      expect(m).toHaveProperty('outputPrice');
    });
  });

  test('should include GPT-4 models', () => {
    const models = listModels();
    const gpt4Models = models.filter(m => m.name.includes('gpt-4'));
    expect(gpt4Models.length).toBeGreaterThan(0);
  });

  test('should include Claude models', () => {
    const models = listModels();
    const claudeModels = models.filter(m => m.name.includes('claude'));
    expect(claudeModels.length).toBeGreaterThan(0);
  });
});

describe('hasTiktoken', () => {
  test('should return boolean', () => {
    const result = hasTiktoken();
    expect(typeof result).toBe('boolean');
  });
});

describe('DEFAULT_MODEL', () => {
  test('should be defined', () => {
    expect(DEFAULT_MODEL).toBeDefined();
  });

  test('should be a known model', () => {
    const info = getModelInfo(DEFAULT_MODEL);
    expect(info.known).toBe(true);
  });
});

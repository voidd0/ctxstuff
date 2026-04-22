/**
 * Jest test setup
 */

// Suppress console output during tests
// Uncomment if needed:
// global.console = {
//   ...console,
//   log: jest.fn(),
//   error: jest.fn(),
//   warn: jest.fn(),
// };

// Increase timeout for slower tests
jest.setTimeout(10000);

// Clean up any temp files after tests
afterAll(() => {
  // Any global cleanup
});

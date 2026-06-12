/** Jest configuration — unit tests + coverage enforcement (>80%). */
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'routes/**/*.js',
    'services/**/*.js',
    'db/**/*.js',
    'lib/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**',
    '!**/*.test.js',
    '!**/env-config.js',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/run-all-tests.js'],
  verbose: true,
  passWithNoTests: true,
};
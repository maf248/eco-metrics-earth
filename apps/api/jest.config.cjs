const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'));

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: 'api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(?:[tj]s|mjs)$': ['@swc/jest', swcJestConfig],
  },
  // NestJS 12 publishes @nestjs/* as ESM; @swc/jest must transform those
  // packages so the CJS test runner can require() them.
  transformIgnorePatterns: ['node_modules/(?!(@nestjs)/)'],
  moduleFileExtensions: ['ts', 'js', 'mjs', 'html'],
  coverageDirectory: 'test-output/jest/coverage',
  coverageReporters: ['text', 'lcov'],
  // Branch coverage is intentionally omitted: NestJS class decorators (@Controller,
  // @Injectable, etc.) generate phantom branches in the SWC-transpiled output that
  // do not correspond to real source logic and cannot be covered by tests.
  coverageThreshold: {
    global: {
      statements: 80,
      functions: 80,
      lines: 80,
    },
  },
  collectCoverage: true,
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
  verbose: true,
};

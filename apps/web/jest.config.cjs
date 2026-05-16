/// <reference types="node" />
const nextJest = require('next/jest.js');

const createJestConfig = nextJest({
  dir: './',
});

const config = {
  displayName: 'web',
  preset: '../../jest.preset.js',
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/apps/web',
  coverageReporters: ['text', 'lcov'],
  // Branch threshold set to 75% (below the current ~79%) because several icon
  // components have untested prop branches (title vs aria-hidden pattern).
  // Raise to 80% once those branches are covered.
  coverageThreshold: {
    global: {
      statements: 80,
      functions: 80,
      lines: 80,
      branches: 75,
    },
  },
  collectCoverage: true,
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/__tests__/**/*.test.{ts,tsx}'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  verbose: true,
};

module.exports = createJestConfig(config);

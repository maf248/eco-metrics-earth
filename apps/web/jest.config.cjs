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
  // Branch threshold at 80% — the icon components' `title` prop branches
  // (aria-labelledby vs aria-hidden) are covered by the barrel icon tests
  // in __tests__/components/icons/.
  coverageThreshold: {
    global: {
      statements: 80,
      functions: 80,
      lines: 80,
      branches: 80,
    },
  },
  collectCoverage: true,
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/__tests__/**/*.test.{ts,tsx}'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  verbose: true,
};

module.exports = createJestConfig(config);

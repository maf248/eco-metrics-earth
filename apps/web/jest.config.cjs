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
  // `server-only` throws outside the Next.js server bundle; map it to an empty stub.
  moduleNameMapper: {
    '^server-only$': '<rootDir>/__mocks__/server-only.ts',
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

// `next/jest` ignores `node_modules` except for an allowlist of packages it knows to be ESM.
// `echarts` and `zrender` ship as ESM only, so they are added to that allowlist.
const ESM_PACKAGES = ['echarts', 'zrender'];
const NEXT_ALLOWLIST_START = '/node_modules/(?!.pnpm)(?!(';

module.exports = async () => {
  const nextConfig = await createJestConfig(config)();
  return {
    ...nextConfig,
    transformIgnorePatterns: nextConfig.transformIgnorePatterns.map((pattern) =>
      pattern.startsWith(NEXT_ALLOWLIST_START)
        ? pattern.replace(NEXT_ALLOWLIST_START, `${NEXT_ALLOWLIST_START}${ESM_PACKAGES.join('|')}|`)
        : pattern,
    ),
  };
};

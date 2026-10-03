// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importX from 'eslint-plugin-import-x';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^\_' }],
      'no-console': 'warn',
    },
  },
  // react-hooks: apply to all web TS/TSX files
  {
    ...reactHooks.configs.flat.recommended,
    files: ['apps/web/**/*.{ts,tsx}'],
  },
  // jsx-a11y: apply to web TSX files only
  {
    ...jsxA11y.flatConfigs.recommended,
    files: ['apps/web/**/*.tsx'],
  },
  // import-x: order and deduplication for all TS/TSX files
  {
    ...importX.flatConfigs.typescript,
    files: ['**/*.{ts,tsx}'],
    rules: {
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
          pathGroups: [
            // The @/ path alias (apps/web/tsconfig.json) is not reliably
            // classified as "internal" by eslint-import-resolver-typescript,
            // so we explicitly place it in the internal group to keep alias
            // imports before relative imports as documented in AGENTS.md.
            { pattern: '@/**', group: 'internal' },
          ],
        },
      ],
      'import-x/no-duplicates': 'error',
    },
  },
  {
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  // Node CLI scripts: console is the intended output interface.
  {
    files: ['scripts/**/*.{js,cjs,mjs}'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    ignores: ['node_modules/**', '**/dist/**', '.nx/**', 'coverage/**', '**/.next/**', '**/*.cts'],
  },
);

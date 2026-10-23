#!/usr/bin/env node
/**
 * Verifies that the Playwright container image used by the CI job matches the
 * installed `@playwright/test` version.
 *
 * `jobs.<id>.container.image` cannot read workflow `env`, so the image tag is
 * a literal in .github/workflows/ci.yml, and Dependabot does not update it.
 * This guard reads that literal and compares it with the installed package so
 * a Playwright bump without an image bump fails early with the fix spelled out.
 *
 * Run after `npm ci`, from anywhere: node scripts/check-playwright-image.mjs
 * Exits 1 on mismatch, or if the workflow line or the package is missing.
 */
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const workflowPath = resolve(repoRoot, '.github/workflows/ci.yml');
const packagePath = resolve(repoRoot, 'node_modules/@playwright/test/package.json');

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (!existsSync(packagePath)) {
  fail('@playwright/test is not installed. Run `npm ci` first.');
}

const installed = JSON.parse(readFileSync(packagePath, 'utf8')).version;

const workflow = readFileSync(workflowPath, 'utf8');
const match = workflow.match(
  /^\s*image:\s*mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)-\S+\s*$/m,
);

if (!match) {
  fail(
    'No `image: mcr.microsoft.com/playwright:v<version>-<distro>` line found in .github/workflows/ci.yml. ' +
      `Set container.image to mcr.microsoft.com/playwright:v${installed}-noble`,
  );
}

const pinned = match[1];

if (pinned !== installed) {
  fail(
    `Playwright image mismatch: @playwright/test is ${installed} but ci.yml uses v${pinned}. ` +
      `Set container.image to mcr.microsoft.com/playwright:v${installed}-noble`,
  );
}

console.log(`Playwright image OK: @playwright/test ${installed} matches ci.yml image v${pinned}.`);

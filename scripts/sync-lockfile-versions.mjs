#!/usr/bin/env node
/**
 * Syncs the workspace `version` fields in package-lock.json with the real
 * package.json versions, without touching anything else.
 *
 * semantic-release bumps package.json versions (root + apps/web + apps/api)
 * but never updates the lockfile, so the lock's embedded version fields drift
 * after every release. This script patches only those fields: no network,
 * no dependency resolution, no transitive changes. Called by the Release
 * workflow after all three releases have bumped their versions.
 *
 * Run from anywhere: node scripts/sync-lockfile-versions.mjs
 * Exits non-zero if the lockfile or a manifest cannot be read or parsed.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const lockPath = resolve(repoRoot, 'package-lock.json');

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const lock = readJson(lockPath);
const rootManifest = readJson(resolve(repoRoot, 'package.json'));

if (!lock.packages || typeof lock.packages !== 'object') {
  throw new Error('package-lock.json has no "packages" map');
}

/** Lock entries for workspace packages: non-empty keys without node_modules. */
const workspaceKeys = Object.keys(lock.packages).filter(
  (key) => key !== '' && !key.includes('node_modules'),
);

const targets = [
  { label: 'root (top-level)', manifest: rootManifest, target: lock },
  { label: 'root (packages[""])', manifest: rootManifest, target: lock.packages[''] },
  ...workspaceKeys.map((key) => ({
    label: key,
    manifest: existsSync(resolve(repoRoot, key, 'package.json'))
      ? readJson(resolve(repoRoot, key, 'package.json'))
      : undefined,
    target: lock.packages[key],
  })),
];

let changed = false;

for (const { label, manifest, target } of targets) {
  if (!target || target.version === undefined) continue;
  if (!manifest || manifest.version === undefined) continue;

  if (target.version !== manifest.version) {
    const previous = target.version;
    target.version = manifest.version;
    changed = true;
    console.log(`\u2713 Synced ${label}: ${previous} \u2192 ${manifest.version}`);
  }
}

if (changed) {
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  console.log('package-lock.json version fields synced.');
} else {
  console.log('package-lock.json version fields already in sync.');
}

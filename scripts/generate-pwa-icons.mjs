#!/usr/bin/env node
/**
 * One-off script to generate PWA raster icons from the SVG logo.
 * Run from the repo root: node scripts/generate-pwa-icons.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const srcSvg = resolve(repoRoot, 'apps/web/public/icons/eco-metrics-earth.svg');
const outDir = resolve(repoRoot, 'apps/web/public/icons');

const icons = [
  { size: 192, filename: 'icon-192.png' },
  { size: 512, filename: 'icon-512.png' },
];

const svgBuffer = readFileSync(srcSvg);

for (const { size, filename } of icons) {
  const outPath = resolve(outDir, filename);
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log(`✓ Generated ${filename} (${size}x${size})`);
}

console.log('Done.');

#!/usr/bin/env node
/**
 * Generates the web app's raster icons from the SVG logo.
 * Run from the repo root: node scripts/generate-pwa-icons.mjs
 *
 * - `any` icons keep the transparent, full-bleed logo.
 * - `maskable` icons scale the logo to 56% — the largest square that fits
 *   inside the maskable safe zone (centered circle of 80% diameter:
 *   0.8 / √2 ≈ 0.566) — on an opaque background, so no launcher mask crops it.
 * - The apple-touch icon keeps a 10% margin per side on an opaque background;
 *   iOS ignores SVG apple-touch-icons and fills transparency with black.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const srcSvg = resolve(repoRoot, 'apps/web/public/icons/eco-metrics-earth.svg');
const outDir = resolve(repoRoot, 'apps/web/public/icons');

// Matches the manifest's `background_color`.
const OPAQUE_BACKGROUND = '#000000';
const MASKABLE_LOGO_SCALE = 0.56;
const APPLE_LOGO_SCALE = 0.8;

const icons = [
  { size: 192, filename: 'icon-192.png' },
  { size: 512, filename: 'icon-512.png' },
  { size: 192, filename: 'icon-maskable-192.png', logoScale: MASKABLE_LOGO_SCALE },
  { size: 512, filename: 'icon-maskable-512.png', logoScale: MASKABLE_LOGO_SCALE },
  { size: 180, filename: 'apple-touch-icon.png', logoScale: APPLE_LOGO_SCALE },
];

const svgBuffer = readFileSync(srcSvg);

for (const { size, filename, logoScale } of icons) {
  const outPath = resolve(outDir, filename);

  if (logoScale === undefined) {
    await sharp(svgBuffer).resize(size, size).png().toFile(outPath);
  } else {
    const logoSize = Math.round(size * logoScale);
    const offset = Math.round((size - logoSize) / 2);
    // Render the SVG at a high density before downscaling so edges stay crisp.
    const logo = await sharp(svgBuffer, { density: 384 })
      .resize(logoSize, logoSize)
      .png()
      .toBuffer();
    await sharp({
      create: { width: size, height: size, channels: 3, background: OPAQUE_BACKGROUND },
    })
      .composite([{ input: logo, top: offset, left: offset }])
      .flatten({ background: OPAQUE_BACKGROUND })
      // sharp applies `composite` last, after `flatten`: drop the alpha channel
      // the overlay reintroduces so the output is fully opaque.
      .removeAlpha()
      .png()
      .toFile(outPath);
  }

  console.log(`✓ Generated ${filename} (${size}x${size})`);
}

console.log('Done.');

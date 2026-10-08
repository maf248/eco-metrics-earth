## MODIFIED Requirements

### Requirement: PWA manifest includes raster icons for installability

The `manifest.ts` SHALL declare, in addition to the SVG entry, 192×192 and 512×512 PNG entries with `purpose: 'any'` (the transparent logo) and separate 192×192 and 512×512 PNG entries with `purpose: 'maskable'`. Maskable PNGs SHALL have an opaque black `#000000` background and keep the whole logo inside the maskable safe zone (the centered circle of 80% diameter), so no launcher mask crops it. No entry SHALL combine both purposes.

#### Scenario: Manifest includes 192px PNG icon

- **WHEN** a browser fetches the PWA manifest
- **THEN** the manifest's `icons` array contains an entry with `src: '/icons/icon-192.png'`, `sizes: '192x192'`, `type: 'image/png'`, and `purpose: 'any'`
- **AND** an entry with `src: '/icons/icon-maskable-192.png'`, `sizes: '192x192'`, `type: 'image/png'`, and `purpose: 'maskable'`

#### Scenario: Manifest includes 512px PNG icon

- **WHEN** a browser fetches the PWA manifest
- **THEN** the manifest's `icons` array contains an entry with `src: '/icons/icon-512.png'`, `sizes: '512x512'`, `type: 'image/png'`, and `purpose: 'any'`
- **AND** an entry with `src: '/icons/icon-maskable-512.png'`, `sizes: '512x512'`, `type: 'image/png'`, and `purpose: 'maskable'`

#### Scenario: Manifest retains existing SVG icon entry

- **WHEN** a browser fetches the PWA manifest
- **THEN** the manifest's `icons` array still contains the SVG icon entry, with `purpose: 'any'`

#### Scenario: PNG icon files exist and are valid images

- **WHEN** the repo is checked out and the web app is built
- **THEN** `apps/web/public/icons/icon-192.png` and `icon-maskable-192.png` exist and are valid 192×192 PNGs
- **THEN** `apps/web/public/icons/icon-512.png` and `icon-maskable-512.png` exist and are valid 512×512 PNGs
- **THEN** `apps/web/public/icons/apple-touch-icon.png` exists and is a valid 180×180 PNG
- **AND** the maskable and apple-touch PNGs have no transparent pixels

### Requirement: PNG icons are generated from the existing SVG via a script

A script at `scripts/generate-pwa-icons.mjs` SHALL use `sharp` to convert the SVG logo to every raster icon the web app declares: the transparent `any` PNGs, the maskable PNGs and the apple-touch PNG. The script SHALL be runnable manually with `node scripts/generate-pwa-icons.mjs` from the repo root.

#### Scenario: Script generates both PNG files

- **WHEN** `node scripts/generate-pwa-icons.mjs` is run from the repo root
- **THEN** `apps/web/public/icons/icon-192.png` is created or overwritten as a 192×192 PNG
- **THEN** `apps/web/public/icons/icon-512.png` is created or overwritten as a 512×512 PNG
- **THEN** `icon-maskable-192.png` (192×192), `icon-maskable-512.png` (512×512) and `apple-touch-icon.png` (180×180) are created or overwritten in the same directory on an opaque `#000000` background

# pwa-icons Specification

## Purpose

TBD - created by archiving change seo-and-performance. Update Purpose after archive.

## Requirements

### Requirement: PWA manifest includes raster icons for installability

The `manifest.ts` SHALL declare 192×192 and 512×512 PNG icon entries in addition to the existing SVG entry. The PNG files SHALL exist at `apps/web/public/icons/icon-192.png` and `apps/web/public/icons/icon-512.png`.

#### Scenario: Manifest includes 192px PNG icon

- **WHEN** a browser fetches the PWA manifest
- **THEN** the manifest's `icons` array contains an entry with `src: '/icons/icon-192.png'`, `sizes: '192x192'`, `type: 'image/png'`, and `purpose: 'any maskable'`

#### Scenario: Manifest includes 512px PNG icon

- **WHEN** a browser fetches the PWA manifest
- **THEN** the manifest's `icons` array contains an entry with `src: '/icons/icon-512.png'`, `sizes: '512x512'`, `type: 'image/png'`, and `purpose: 'any maskable'`

#### Scenario: Manifest retains existing SVG icon entry

- **WHEN** a browser fetches the PWA manifest
- **THEN** the manifest's `icons` array still contains the SVG icon entry

#### Scenario: PNG icon files exist and are valid images

- **WHEN** the repo is checked out and the web app is built
- **THEN** `apps/web/public/icons/icon-192.png` exists and is a valid 192×192 PNG
- **THEN** `apps/web/public/icons/icon-512.png` exists and is a valid 512×512 PNG

### Requirement: PNG icons are generated from the existing SVG via a script

A script at `scripts/generate-pwa-icons.mjs` SHALL use `sharp` to convert the SVG logo to PNG at the required dimensions. The script SHALL be runnable manually with `node scripts/generate-pwa-icons.mjs` from the repo root.

#### Scenario: Script generates both PNG files

- **WHEN** `node scripts/generate-pwa-icons.mjs` is run from the repo root
- **THEN** `apps/web/public/icons/icon-192.png` is created or overwritten as a 192×192 PNG
- **THEN** `apps/web/public/icons/icon-512.png` is created or overwritten as a 512×512 PNG

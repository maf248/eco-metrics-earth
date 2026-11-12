#!/usr/bin/env node
/**
 * Generates the municipal waste dataset bundled with the API from the World Bank "What a Waste 3.0"
 * country workbook (CC BY 4.0).
 *
 *   npm run data:waste-recycling -- <workbook.xlsx> --retrieved YYYY-MM-DD
 *
 * Workbook: https://datacatalogfiles.worldbank.org/ddh-published/0039597/DR0095901/What_a_Waste_3.0_COUNTRY_Dataset_&_Codebook.xlsx
 *
 * The retrieval date is an argument, never the clock, so the same workbook always gives the same
 * bytes. The transform itself is in `scripts/lib/waste-recycling-transform.mjs`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { unzipSync, strFromU8 } from 'fflate';
import { format, resolveConfig } from 'prettier';

import {
  buildDataset,
  parseCrosswalk,
  readSharedStrings,
  readSheet,
  sheetPaths,
  withIso2,
} from './lib/waste-recycling-transform.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = resolve(
  repoRoot,
  'apps/api/src/modules/waste-recycling/data/waste-recycling.json',
);

function parseArguments(argv) {
  const args = argv.slice(2);
  const retrievedAt = args.indexOf('--retrieved');
  const retrieved = retrievedAt === -1 ? undefined : args[retrievedAt + 1];
  const workbook = args.find(
    (arg, position) => !arg.startsWith('--') && position !== retrievedAt + 1,
  );
  if (!workbook || !retrieved || !/^\d{4}-\d{2}-\d{2}$/.test(retrieved)) {
    throw new Error(
      'Usage: generate-waste-recycling-data.mjs <workbook.xlsx> --retrieved YYYY-MM-DD',
    );
  }
  return { workbook: resolve(workbook), retrieved };
}

try {
  const { workbook, retrieved } = parseArguments(process.argv);
  const files = unzipSync(new Uint8Array(readFileSync(workbook)));
  const text = (path) => (files[path] ? strFromU8(files[path]) : undefined);
  const paths = sheetPaths(text('xl/workbook.xml'), text('xl/_rels/workbook.xml.rels'));
  const shared = readSharedStrings(text('xl/sharedStrings.xml'));
  const sheet = (name) => {
    if (!paths.has(name)) {
      throw new Error(`The workbook has no "${name}" sheet`);
    }
    return readSheet(text(paths.get(name)), shared);
  };

  const crosswalk = parseCrosswalk(
    readFileSync(resolve(repoRoot, 'packages/shared/src/lib/country-codes.ts'), 'utf8'),
  );
  const dataset = withIso2(
    buildDataset(sheet('Country dataset'), sheet('Codebook'), retrieved),
    crosswalk,
  );
  const config = (await resolveConfig(OUT_FILE)) ?? {};
  const output = await format(JSON.stringify(dataset), { ...config, filepath: OUT_FILE });
  writeFileSync(OUT_FILE, output);
  console.log(`Wrote ${dataset.countries.length} countries to ${OUT_FILE}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

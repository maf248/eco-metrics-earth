#!/usr/bin/env node
/**
 * Checks whether the World Bank "What a Waste" source changed since the bundled waste dataset was
 * generated (a new edition on the portal, or a revised or moved workbook).
 *
 *   node scripts/check-waste-recycling-source.mjs [--body-file <path>]
 *
 * With findings it writes a Markdown issue body to `--body-file` and sets `changed=true` in
 * `$GITHUB_OUTPUT` (else `changed=false`). A network error exits non-zero, so a failed scheduled run
 * notifies the owner. Used by `.github/workflows/waste-data-check.yml`; no dependencies.
 */
import { appendFileSync, writeFileSync } from 'node:fs';

import { detectSourceChanges, WASTE_SOURCE } from './lib/waste-recycling-source.mjs';

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

function parseBodyFile(argv) {
  const at = argv.indexOf('--body-file');
  return at === -1 ? undefined : argv[at + 1];
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/** `fetch` that follows redirects and retries on 429 and 5xx; a network error propagates. */
async function request(url, method) {
  let response;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    response = await fetch(url, { method, redirect: 'follow' });
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === MAX_ATTEMPTS) break;
    await sleep(RETRY_DELAY_MS * attempt);
  }
  return response;
}

function buildIssueBody(findings, retrievedOn) {
  const lines = [
    `The monthly check (${retrievedOn}) found changes in the World Bank "What a Waste" source behind the bundled waste dataset (edition ${WASTE_SOURCE.edition}).`,
    '',
    '## Findings',
    '',
    ...findings.map((finding) => `- ${finding}`),
    '',
    '## Links',
    '',
    `- Catalog: ${WASTE_SOURCE.catalogUrl}`,
    `- Portal: ${WASTE_SOURCE.portalUrl}`,
    `- Current workbook: ${WASTE_SOURCE.workbookUrl}`,
    '',
    '## How to update',
    '',
    '1. Download the country workbook from the catalog page (or the workbook URL above if it still works).',
    "2. From the repo root, regenerate the dataset with today's date:",
    '   `npm run data:waste-recycling -- <path-to-workbook.xlsx> --retrieved YYYY-MM-DD`',
    '3. Review the diff of `apps/api/src/modules/waste-recycling/data/waste-recycling.json`.',
    '4. Update `WASTE_SOURCE` in `scripts/lib/waste-recycling-source.mjs` (`edition`, `workbookUrl`, `workbookLastModified`, `lastUpdated`).',
    '5. Run the tests and update any expectation tied to the data (for example `lastUpdated` in the API tests).',
    '6. Commit the dataset and the source identity together.',
    '',
    'Details: `docs/data-sources/waste-recycling.md` (Updating the dataset).',
    '',
  ];
  return lines.join('\n');
}

async function main() {
  const bodyFile = parseBodyFile(process.argv);

  const portal = await request(WASTE_SOURCE.portalUrl, 'GET');
  if (!portal.ok) throw new Error(`Portal answered HTTP ${portal.status}`);
  const portalHtml = await portal.text();

  const head = await request(WASTE_SOURCE.workbookUrl, 'HEAD');
  // A server that is still busy or failing says nothing about the file: fail the run, not an issue.
  if (head.status === 429 || head.status >= 500) {
    throw new Error(`Workbook answered HTTP ${head.status}`);
  }
  const workbook = { status: head.status, lastModified: head.headers.get('last-modified') };

  const findings = detectSourceChanges({ portalHtml, workbook });
  const changed = findings.length > 0;

  if (changed && bodyFile) {
    writeFileSync(bodyFile, buildIssueBody(findings, new Date().toISOString().slice(0, 10)));
  }
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
  }

  console.log(`Bundled edition: ${WASTE_SOURCE.edition}`);
  console.log(`Workbook: HTTP ${workbook.status}, Last-Modified ${workbook.lastModified ?? 'n/a'}`);
  if (changed) {
    console.log('Changes found:');
    for (const finding of findings) console.log(`- ${finding}`);
  } else {
    console.log('No changes: the source matches the bundled dataset.');
  }
}

try {
  await main();
} catch (error) {
  console.error(`Source check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

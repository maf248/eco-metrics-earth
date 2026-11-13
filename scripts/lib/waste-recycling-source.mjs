/**
 * Identity of the World Bank "What a Waste" source behind the bundled waste dataset, and the pure
 * logic that decides whether the source changed. No file or network access, so Jest can import it;
 * `scripts/check-waste-recycling-source.mjs` wraps it with the HTTP calls.
 *
 * After regenerating the dataset from a new workbook, update `WASTE_SOURCE` by hand.
 */

export const WASTE_SOURCE = {
  /** Edition of the report the bundled dataset comes from. */
  edition: '3.0',
  workbookUrl:
    'https://datacatalogfiles.worldbank.org/ddh-published/0039597/DR0095901/What_a_Waste_3.0_COUNTRY_Dataset_&_Codebook.xlsx',
  /** `Last-Modified` header of the workbook when the dataset was generated. */
  workbookLastModified: 'Fri, 20 Mar 2026 12:25:30 GMT',
  portalUrl: 'https://datatopics.worldbank.org/what-a-waste/',
  catalogUrl:
    'https://datacatalog.worldbank.org/search/dataset/0039597/what-a-waste-global-database',
  /** Last update of the World Bank files (catalog page). */
  lastUpdated: '2026-03-11',
};

const EDITION_PATTERN = /what\s+a\s+waste\s+(\d+)\.(\d+)/gi;

/** Parses "major.minor" into numbers, or `undefined` when it is not that shape. */
function parseEdition(edition) {
  const match = /^(\d+)\.(\d+)$/.exec(String(edition).trim());
  return match ? [Number(match[1]), Number(match[2])] : undefined;
}

/** True when `candidate` is a strictly higher major.minor than `current` (numeric, so 3.10 > 3.9). */
export function isNewerEdition(candidate, current) {
  const a = parseEdition(candidate);
  const b = parseEdition(current);
  if (!a || !b) return false;
  return a[0] !== b[0] ? a[0] > b[0] : a[1] > b[1];
}

/** Highest "What a Waste N.N" edition mentioned in the HTML (case-insensitive), or `null`. */
export function highestEditionMentioned(html) {
  let highest = null;
  for (const match of String(html ?? '').matchAll(EDITION_PATTERN)) {
    const edition = `${match[1]}.${match[2]}`;
    if (highest === null || isNewerEdition(edition, highest)) highest = edition;
  }
  return highest;
}

/**
 * Human-readable findings when the source moved on from `WASTE_SOURCE`; an empty array means
 * nothing new. `workbook` is the outcome of a HEAD request: `{ status, lastModified }`.
 */
export function detectSourceChanges({ portalHtml, workbook }, source = WASTE_SOURCE) {
  const findings = [];

  const mentioned = highestEditionMentioned(portalHtml);
  if (mentioned !== null && isNewerEdition(mentioned, source.edition)) {
    findings.push(
      `The portal mentions "What a Waste ${mentioned}", newer than the bundled edition ${source.edition}.`,
    );
  }

  if (workbook.status !== 200) {
    findings.push(
      `The workbook URL answered HTTP ${workbook.status} instead of 200: it was moved or removed, which usually means a new edition.`,
    );
  } else if (workbook.lastModified && workbook.lastModified !== source.workbookLastModified) {
    findings.push(
      `The workbook was revised: Last-Modified is "${workbook.lastModified}", the bundled data used "${source.workbookLastModified}".`,
    );
  }

  return findings;
}

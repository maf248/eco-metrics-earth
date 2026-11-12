/** Types of the pure transform, for the Jest suite that imports it from TypeScript. */

/** A cell value as read from the workbook: text, a number, a boolean or `null` when blank. */
export type Cell = string | number | boolean | null | undefined;

export interface WasteDatasetCountry {
  code: string;
  iso2: string | null;
  name: string;
  population: number | null;
  generation: Record<string, number | null>;
  treatment?: { year: number; shares: Record<string, number | null> };
  composition?: { year: number; shares: Record<string, number | null> };
}

export interface WasteDataset {
  lastUpdated: string;
  retrieved: string;
  world: {
    generation: Record<string, number>;
    recycling: { sharePercent: number; countries: number; populationSharePercent: number };
  };
  countries: WasteDatasetCountry[];
}

export const TREATMENT_GROUPS: Record<string, string[]>;
export const COMPOSITION_GROUPS: Record<string, string[]>;
export const COUNTRY_KEYS: string[];

export function decodeXml(text: string): string;
export function readSharedStrings(xml: string | undefined): string[];
export function readSheet(xml: string, shared: string[]): Cell[][];
export function sheetPaths(workbookXml: string, relsXml: string): Map<string, string>;
export function indexByHeader(
  headerRow: Cell[],
  required: readonly string[],
  sheet: string,
): Map<string, number>;
export function groupValue(
  row: Cell[],
  columns: readonly string[],
  index: Map<string, number>,
): number | null;
export function roundToHundred(
  shares: Record<string, number | null>,
): Record<string, number | null>;
export function normalizedShares(
  row: Cell[],
  groups: Record<string, string[]>,
  index: Map<string, number>,
  label: string,
): Record<string, number | null> | null;
export function dataYears(codebookRows: Cell[][], index: Map<string, number>): Map<string, number>;
export function parseCrosswalk(source: string): Map<string, string>;
export function withIso2(dataset: WasteDataset, crosswalk: Map<string, string>): WasteDataset;
export function buildDataset(
  countryRows: Cell[][],
  codebookRows: Cell[][],
  retrieved: string,
): WasteDataset;

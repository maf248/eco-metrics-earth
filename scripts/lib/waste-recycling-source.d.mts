/** Types of the source identity and change detection, for the Jest suite that imports them from TypeScript. */

export interface WasteSource {
  edition: string;
  workbookUrl: string;
  workbookLastModified: string;
  portalUrl: string;
  catalogUrl: string;
  lastUpdated: string;
}

export interface WorkbookHead {
  status: number;
  lastModified: string | null | undefined;
}

export const WASTE_SOURCE: WasteSource;

export function isNewerEdition(candidate: string, current: string): boolean;
export function highestEditionMentioned(html: string | null | undefined): string | null;
export function detectSourceChanges(
  input: { portalHtml: string | null | undefined; workbook: WorkbookHead },
  source?: WasteSource,
): string[];

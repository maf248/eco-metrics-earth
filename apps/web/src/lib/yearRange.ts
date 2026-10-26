/** Axis categories: every year from `startYear` to `endYear`. */
export function listYears(range: { startYear: number; endYear: number }): number[] {
  return Array.from(
    { length: range.endYear - range.startYear + 1 },
    (_, index) => range.startYear + index,
  );
}

const COLOR_PATTERNS = [
  /^#[0-9a-f]{3,8}$/i,
  /^(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\(/i,
  /var\(--/,
];

/**
 * Every string of a chart option that is a color, however it is written. Chart options never name
 * a color (rule 1 of the chart rules): the theme adapter gives them theirs. Functions are skipped
 * (they hold no data) and an option is walked as the JSON it serialises to.
 */
export function findColorStrings(option: unknown): string[] {
  const found: string[] = [];
  const walk = (value: unknown): void => {
    if (typeof value === 'string') {
      if (COLOR_PATTERNS.some((pattern) => pattern.test(value.trim()))) {
        found.push(value);
      }
    } else if (Array.isArray(value)) {
      value.forEach(walk);
    } else if (typeof value === 'object' && value !== null) {
      Object.values(value).forEach(walk);
    }
  };
  walk(option);
  return found;
}

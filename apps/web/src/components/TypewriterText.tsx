import type { CSSProperties } from 'react';

/** Position of a character in the typing order, read by the `typewriter-*` rules. */
function typingIndex(index: number): CSSProperties {
  return { '--typewriter-index': index } as CSSProperties;
}

/** A stable key per character: the character and which of its occurrences it is. */
function occurrenceKeys(characters: string[]): string[] {
  const seen = new Map<string, number>();
  return characters.map((character) => {
    const occurrence = (seen.get(character) ?? 0) + 1;
    seen.set(character, occurrence);
    return `${character}-${occurrence}`;
  });
}

/**
 * Text that types itself in, with the terminal cursor of the brand. Server-rendered and
 * CSS-only (`globals.css`): the whole text is in the HTML at its final size, each character
 * is only hidden until its turn, so nothing shifts and nothing waits for JavaScript. With
 * reduced motion the text and a steady cursor show at once.
 *
 * The characters are `aria-hidden`: the parent names itself with `aria-label`, so a screen
 * reader gets the sentence instead of single letters.
 */
export function TypewriterText({ text }: { text: string }) {
  const characters = Array.from(text);
  const keys = occurrenceKeys(characters);

  return (
    <span aria-hidden="true">
      {characters.map((character, index) => (
        <span key={keys[index]} className="typewriter-char" style={typingIndex(index)}>
          {character}
        </span>
      ))}
      <span className="typewriter-cursor select-none" style={typingIndex(characters.length)}>
        <span className="animate-cursor-blink">▋</span>
      </span>
    </span>
  );
}

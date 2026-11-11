import { render } from '@testing-library/react';

import { TypewriterText } from '@/components/TypewriterText';

function typingIndex(element: Element): string {
  return (element as HTMLElement).style.getPropertyValue('--typewriter-index');
}

describe('TypewriterText', () => {
  it('should render the whole text, one character per element, in order', () => {
    const { container } = render(<TypewriterText text="made readable" />);
    const characters = Array.from(container.querySelectorAll('.typewriter-char'));

    expect(characters.map((character) => character.textContent).join('')).toBe('made readable');
    expect(characters.map(typingIndex)).toEqual(characters.map((_, index) => String(index)));
  });

  it('should close with a blinking cursor that waits for the last character', () => {
    const { container } = render(<TypewriterText text="abc" />);
    const cursor = container.querySelector('.typewriter-cursor');

    expect(cursor).toHaveTextContent('▋');
    expect(cursor?.querySelector('.animate-cursor-blink')).not.toBeNull();
    expect(cursor && typingIndex(cursor)).toBe('3');
  });

  it('should hide the split characters from assistive technology', () => {
    const { container } = render(<TypewriterText text="abc" />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});

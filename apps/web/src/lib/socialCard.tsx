import type { ReactElement, ReactNode } from 'react';

// Social card palette (see `docs/design-system.md`): Satori renders inline styles only, no tokens.
const BACKGROUND = '#000000';
const ACCENT = '#10b981';
const HEADING = '#ffffff';
const BODY = '#d1d5db';

interface SocialCardProps {
  /** The 320×320 artwork on the left: an inline SVG, never a file read. */
  icon: ReactNode;
  heading: string;
  body: string;
  /** Accent line under the body: the CTA of the site card, the site name of a category card. */
  accent: string;
  /** Body font size: smaller for the longer category descriptions. */
  bodyFontSize?: number;
}

/** The `ImageResponse` element shared by the site card and the category cards. */
export function SocialCard({
  icon,
  heading,
  body,
  accent,
  bodyFontSize = 34,
}: SocialCardProps): ReactElement {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 56,
        padding: '0 96px',
        background: BACKGROUND,
        borderBottom: `16px solid ${ACCENT}`,
      }}
    >
      {icon}
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', fontSize: 68, color: HEADING }}>{heading}</div>
        <div style={{ display: 'flex', fontSize: bodyFontSize, color: BODY, lineHeight: 1.35 }}>
          {body}
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: ACCENT }}>{accent}</div>
      </div>
    </div>
  );
}

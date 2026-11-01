import { ImageResponse } from 'next/og';

import { SiteLogoIcon } from '@/components/icons';
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME } from '@/lib/socialMetadata';

// Site-wide social card (see OG_IMAGE). No request-time APIs: prerendered once
// at build time and served as a static PNG, the default for a GET handler that reads no request.
const BACKGROUND = '#000000';
const ACCENT = '#10b981';
const CTA = 'Explore the data →';

export function GET(): ImageResponse {
  return new ImageResponse(
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
      {/* Inline SVG, not a file read: the build cwd differs locally and on Vercel. */}
      <SiteLogoIcon width={320} height={320} />
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', fontSize: 68, color: '#ffffff' }}>{SITE_NAME}</div>
        <div style={{ display: 'flex', fontSize: 34, color: '#d1d5db', lineHeight: 1.35 }}>
          {SITE_DESCRIPTION}
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: ACCENT }}>{CTA}</div>
      </div>
    </div>,
    { width: OG_IMAGE.width, height: OG_IMAGE.height },
  );
}

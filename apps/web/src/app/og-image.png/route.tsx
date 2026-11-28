import { ImageResponse } from 'next/og';

import { SiteLogoIcon } from '@/components/icons';
import { SocialCard } from '@/lib/socialCard';
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME } from '@/lib/socialMetadata';

// Site-wide social card (see OG_IMAGE). No request-time APIs: prerendered once
// at build time and served as a static PNG, the default for a GET handler that reads no request.
const CTA = 'Explore the data →';

export function GET(): ImageResponse {
  return new ImageResponse(
    // Inline SVG, not a file read: the build cwd differs locally and on Vercel.
    SocialCard({
      icon: <SiteLogoIcon width={320} height={320} />,
      heading: SITE_NAME,
      body: SITE_DESCRIPTION,
      accent: CTA,
    }),
    { width: OG_IMAGE.width, height: OG_IMAGE.height },
  );
}

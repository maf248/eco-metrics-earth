import { ImageResponse } from 'next/og';

import { CATEGORY_ICONS } from '@/lib/categoryIcon';
import { CATEGORY_DESCRIPTIONS } from '@/lib/categoryMetadata';
import { getCategoryTitle } from '@/lib/categoryTitle';
import { isEcoCategory } from '@/lib/isEcoCategory';
import { SocialCard } from '@/lib/socialCard';
import { OG_IMAGE, SITE_NAME } from '@/lib/socialMetadata';
import { ECO_CATEGORIES } from '@eco-metrics/shared';

// Per-category social card. Static data only, so every card is prerendered at build time; the
// `.png` path avoids the trailing-slash 308 that some scrapers do not follow (see OG_IMAGE).
export function generateStaticParams(): { category: string }[] {
  return Object.values(ECO_CATEGORIES).map((category) => ({ category }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ category: string }> },
): Promise<Response> {
  const { category } = await params;
  if (!isEcoCategory(category)) {
    return new Response(null, { status: 404 });
  }
  const Icon = CATEGORY_ICONS[category];

  return new ImageResponse(
    SocialCard({
      icon: <Icon width={320} height={320} />,
      heading: getCategoryTitle(category),
      body: CATEGORY_DESCRIPTIONS[category],
      accent: SITE_NAME,
      bodyFontSize: 30,
    }),
    { width: OG_IMAGE.width, height: OG_IMAGE.height },
  );
}

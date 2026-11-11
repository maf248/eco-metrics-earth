import { render, screen, within } from '@testing-library/react';

import HomePage, { metadata } from '@/app/page';
import { getCategoryMetadataTitle } from '@/lib/categoryMetadata';
import { getCategoryTitle } from '@/lib/categoryTitle';
import { LIVE_CATEGORIES, LIVE_CATEGORY_SUMMARIES, isLiveCategory } from '@/lib/liveCategories';
import { OG_IMAGE, SITE_DESCRIPTION } from '@/lib/socialMetadata';
import { ECO_CATEGORIES } from '@eco-metrics/shared';

describe('HomePage', () => {
  it('should render a single h1 with the value proposition', () => {
    render(<HomePage />);
    const headings = screen.getAllByRole('heading', { level: 1 });

    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveAccessibleName('Environmental data, made readable');
    // The sentence is in the HTML itself, not only in the label.
    expect(headings[0].textContent).toBe('Environmental data, made readable▋');
  });

  it('should render the shared site description', () => {
    render(<HomePage />);
    expect(screen.getByText(SITE_DESCRIPTION)).toBeInTheDocument();
  });

  it('should not render any "coming soon" text', () => {
    render(<HomePage />);
    expect(screen.queryByText(/coming soon/i)).toBeNull();
  });

  it('should render the site logo with aria-hidden', () => {
    render(<HomePage />);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('should leave the <main> landmark to the root layout', () => {
    const { container } = render(<HomePage />);
    expect(container.querySelector('main')).toBeNull();
  });

  it('should link the hero call to action to the topics section', () => {
    const { container } = render(<HomePage />);
    const callToAction = screen.getByRole('link', { name: /^Explore the data/ });

    expect(callToAction).toHaveAttribute('href', '#topics');
    expect(container.querySelector('#topics')).not.toBeNull();
  });
});

describe('HomePage — topics', () => {
  function topics(): HTMLElement {
    return screen.getByRole('region', { name: 'Explore the data' });
  }

  it('should render one card per live category, in navigation order', () => {
    render(<HomePage />);
    const titles = within(topics())
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);

    expect(titles).toEqual(LIVE_CATEGORIES.map(getCategoryMetadataTitle));
    expect(within(topics()).getAllByRole('listitem')).toHaveLength(LIVE_CATEGORIES.length);
  });

  it('should give every card its summary and a link to its category', () => {
    render(<HomePage />);

    for (const category of LIVE_CATEGORIES) {
      const link = within(topics()).getByRole('link', {
        name: `Explore ${getCategoryTitle(category)}`,
      });
      // next/link strips the trailing slash in jsdom.
      expect(link).toHaveAttribute('href', `/${category}`);
      expect(
        within(topics()).getByText(LIVE_CATEGORY_SUMMARIES[category] as string),
      ).toBeInTheDocument();
    }
  });

  it('should render exactly one link per card', () => {
    render(<HomePage />);
    expect(within(topics()).getAllByRole('link')).toHaveLength(LIVE_CATEGORIES.length);
  });

  it('should not link to any placeholder category', () => {
    const { container } = render(<HomePage />);
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));

    for (const category of Object.values(ECO_CATEGORIES)) {
      if (!isLiveCategory(category)) {
        expect(hrefs).not.toContain(`/${category}`);
      }
    }
  });
});

describe('HomePage — data sources and structured data', () => {
  it('should link to the data sources page under its own heading', () => {
    render(<HomePage />);
    const section = screen.getByRole('region', { name: 'Where the data comes from' });

    expect(within(section).getByRole('link', { name: 'data sources' })).toHaveAttribute(
      'href',
      '/data-sources',
    );
  });

  it('should keep the heading order h1, h2 sections and h3 cards', () => {
    render(<HomePage />);
    const levels = screen
      .getAllByRole('heading')
      .map((heading) => Number(heading.tagName.slice(1)));

    expect(levels).toEqual([1, 2, ...LIVE_CATEGORIES.map(() => 3), 2]);
  });

  it('should embed the site structured data', () => {
    const { container } = render(<HomePage />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const types = (JSON.parse(script?.textContent ?? '{}')['@graph'] as { '@type': string }[]).map(
      (node) => node['@type'],
    );

    expect(types).toEqual(['Organization', 'WebSite']);
  });
});

describe('HomePage metadata', () => {
  it('should have the keyword-bearing home title', () => {
    expect(metadata.title).toBe('eco-metrics earth | CO2, Climate, Energy & Water Data');
  });

  it('should have a title of 50-60 characters', () => {
    const length = (metadata.title as string).length;
    expect(length).toBeGreaterThanOrEqual(50);
    expect(length).toBeLessThanOrEqual(60);
  });

  it('should use the shared site description', () => {
    expect(metadata.description).toBe(SITE_DESCRIPTION);
  });

  it('should match the openGraph and twitter title and description to the page', () => {
    expect(metadata.openGraph?.title).toBe(metadata.title);
    expect(metadata.openGraph?.description).toBe(metadata.description);
    expect(metadata.twitter?.title).toBe(metadata.title);
    expect(metadata.twitter?.description).toBe(metadata.description);
  });

  it('should have a canonical URL ending with trailing slash', () => {
    const canonical = metadata.alternates?.canonical as string;
    expect(canonical).toMatch(/\/$/);
  });

  it('should have openGraph url ending with trailing slash', () => {
    const url = metadata.openGraph?.url as string;
    expect(url).toMatch(/\/$/);
  });

  it('should keep the shared openGraph fields and social card', () => {
    const openGraph = metadata.openGraph as { type?: string; images?: unknown };
    expect(openGraph.type).toBe('website');
    expect(metadata.openGraph?.siteName).toBe('eco-metrics earth');
    expect(openGraph.images).toEqual([OG_IMAGE]);
  });

  it('should use the summary_large_image twitter card', () => {
    expect((metadata.twitter as { card?: string }).card).toBe('summary_large_image');
  });
});

describe('HomePage snapshots', () => {
  it('should match the full page snapshot', () => {
    const { asFragment } = render(<HomePage />);
    expect(asFragment()).toMatchSnapshot();
  });
});

describe('HomePage — layout', () => {
  it('should render the content with top-anchored layout (justify-start)', () => {
    const { container } = render(<HomePage />);
    const content = container.firstElementChild;
    expect(content?.className).toContain('justify-start');
    expect(content?.className).not.toContain('justify-center');
  });

  it('should clear the mobile header with pt-header top padding', () => {
    const { container } = render(<HomePage />);
    const content = container.firstElementChild;
    expect(content?.className).toContain('pt-header');
  });
});

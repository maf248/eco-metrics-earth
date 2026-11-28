import { connection } from 'next/server';

import sitemap from '@/app/sitemap';
import { getCategoryLastModified } from '@/lib/categoryPages';
import { LIVE_CATEGORIES, isLiveCategory } from '@/lib/liveCategories';
import { ECO_CATEGORIES } from '@eco-metrics/shared';

jest.mock('next/server', () => ({ connection: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/categoryPages', () => ({ getCategoryLastModified: jest.fn() }));

const OLDER = new Date('2026-10-01T00:00:00.000Z');
const NEWER = new Date('2026-11-20T00:00:00.000Z');

describe('sitemap', () => {
  beforeEach(() => {
    jest.mocked(getCategoryLastModified).mockReset().mockResolvedValue(undefined);
  });

  it('should return one entry for home, each live category, data sources and privacy', async () => {
    const result = await sitemap();
    expect(result).toHaveLength(3 + LIVE_CATEGORIES.length);
  });

  it('should list each category with live data exactly once', async () => {
    const urls = (await sitemap()).map(({ url }) => url);
    for (const category of LIVE_CATEGORIES) {
      expect(urls.filter((url) => url.endsWith(`/${category}/`))).toHaveLength(1);
    }
  });

  it('should list every category with live data', async () => {
    const urls = (await sitemap()).map(({ url }) => url);
    for (const category of LIVE_CATEGORIES) {
      expect(urls.some((url) => url.endsWith(`/${category}/`))).toBe(true);
    }
  });

  it('should list the deforestation page with a trailing slash and the category priority', async () => {
    const entries = await sitemap();
    const deforestation = entries.filter(({ url }) => url.endsWith('/deforestation/'));

    expect(deforestation).toHaveLength(1);
    expect(deforestation[0].priority).toBe(0.8);
  });

  it('should list ocean-health, now live, and no longer treat it as a placeholder', async () => {
    const urls = (await sitemap()).map(({ url }) => url);

    expect(urls.filter((url) => url.endsWith('/ocean-health/'))).toHaveLength(1);
    expect(LIVE_CATEGORIES).toContain('ocean-health');
  });

  it('should not list any placeholder category', async () => {
    const urls = (await sitemap()).map(({ url }) => url);
    for (const category of Object.values(ECO_CATEGORIES)) {
      if (!isLiveCategory(category)) {
        expect(urls.some((url) => url.endsWith(`/${category}/`))).toBe(false);
      }
    }
  });

  it('should have home entry with priority 1.0', async () => {
    const result = await sitemap();
    const home = result[0];
    expect(home.priority).toBe(1.0);
  });

  it('should have home URL ending with trailing slash', async () => {
    const result = await sitemap();
    expect(result[0].url).toMatch(/\/$/);
  });

  it('should have all category entries with priority 0.8', async () => {
    const result = await sitemap();
    const categories = result.slice(1, -2);
    categories.forEach((entry) => {
      expect(entry.priority).toBe(0.8);
    });
  });

  it('should have all URLs ending with trailing slash', async () => {
    const result = await sitemap();
    result.forEach((entry) => {
      expect(entry.url).toMatch(/\/$/);
    });
  });

  it('should have changeFrequency weekly for the home and category entries', async () => {
    const result = await sitemap();
    result.slice(0, -2).forEach((entry) => {
      expect(entry.changeFrequency).toBe('weekly');
    });
  });

  it('should include the data sources page once, monthly with priority 0.5', async () => {
    const entries = (await sitemap()).filter(({ url }) => url.endsWith('/data-sources/'));

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ changeFrequency: 'monthly', priority: 0.5 });
  });

  it('should include the privacy page once, yearly with priority 0.3', async () => {
    const entries = (await sitemap()).filter(({ url }) => url.endsWith('/privacy/'));

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ changeFrequency: 'yearly', priority: 0.3 });
  });

  it('should list the privacy page without lastModified even when every date is known', async () => {
    jest.mocked(getCategoryLastModified).mockResolvedValue(NEWER);
    const entry = (await sitemap()).find(({ url }) => url.endsWith('/privacy/'));

    expect(entry).toBeDefined();
    expect(entry).not.toHaveProperty('lastModified');
  });

  it('should date each category entry with its data date', async () => {
    jest
      .mocked(getCategoryLastModified)
      .mockImplementation(async (category) => (category === 'co2-emissions' ? NEWER : OLDER));
    const entries = await sitemap();

    expect(entries.find(({ url }) => url.endsWith('/co2-emissions/'))?.lastModified).toEqual(NEWER);
    expect(entries.find(({ url }) => url.endsWith('/energy-sources/'))?.lastModified).toEqual(
      OLDER,
    );
  });

  it('should date home and data sources with the latest category date', async () => {
    jest
      .mocked(getCategoryLastModified)
      .mockImplementation(async (category) => (category === 'ocean-health' ? NEWER : OLDER));
    const entries = await sitemap();

    expect(entries[0].lastModified).toEqual(NEWER);
    expect(entries.find(({ url }) => url.endsWith('/data-sources/'))?.lastModified).toEqual(NEWER);
  });

  it('should list an entry without lastModified when its date is unknown', async () => {
    jest
      .mocked(getCategoryLastModified)
      .mockImplementation(async (category) => (category === 'co2-emissions' ? undefined : OLDER));
    const entries = await sitemap();
    const co2 = entries.find(({ url }) => url.endsWith('/co2-emissions/'));

    expect(co2).toBeDefined();
    expect(co2).not.toHaveProperty('lastModified');
  });

  it('should list every entry without lastModified when no date is known', async () => {
    const entries = await sitemap();

    expect(entries).toHaveLength(3 + LIVE_CATEGORIES.length);
    entries.forEach((entry) => expect(entry).not.toHaveProperty('lastModified'));
  });

  it('should read every live category once', async () => {
    await sitemap();

    expect(jest.mocked(getCategoryLastModified).mock.calls.map(([category]) => category)).toEqual([
      ...LIVE_CATEGORIES,
    ]);
  });

  it('should opt into request-time rendering before reading any data', async () => {
    const order: string[] = [];
    jest.mocked(connection).mockImplementationOnce(async () => {
      order.push('connection');
    });
    jest.mocked(getCategoryLastModified).mockImplementation(async () => {
      order.push('read');
      return undefined;
    });
    await sitemap();

    expect(order[0]).toBe('connection');
    expect(order.filter((step) => step === 'connection')).toHaveLength(1);
  });
});

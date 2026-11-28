import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';

import { metadata as layoutMetadata } from '@/app/layout';
import PrivacyPage, { metadata } from '@/app/privacy/page';
import { PRIVACY_LAST_UPDATED } from '@/lib/privacyPolicy';
import { OG_IMAGE } from '@/lib/socialMetadata';

// The request-time rule is a property of the page's source, so it is checked there.
const SOURCE = readFileSync(join(__dirname, '../../../src/app/privacy/page.tsx'), 'utf8');

describe('PrivacyPage', () => {
  it('should render exactly one h1 named Privacy and h2 sections', () => {
    render(<PrivacyPage />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThanOrEqual(3);
  });

  it('should say there are no cookies, only a theme preference, and no accounts or forms', () => {
    const { container } = render(<PrivacyPage />);

    expect(container).toHaveTextContent('sets no cookies');
    expect(container).toHaveTextContent('theme choice');
    expect(container).toHaveTextContent('never leaves your device');
    expect(container).toHaveTextContent('no accounts and no forms');
  });

  it('should describe the aggregate visit counts and the sampled speed measurement', () => {
    const { container } = render(<PrivacyPage />);

    expect(container).toHaveTextContent('counted in aggregate');
    expect(container).toHaveTextContent('Page speed is measured on a sample of visits');
    expect(container).toHaveTextContent('follows you across days or sites');
  });

  it('should mention hosting logs, error reports and that no data is sold', () => {
    const { container } = render(<PrivacyPage />);

    expect(container).toHaveTextContent('standard request logs');
    expect(container).toHaveTextContent('errors are reported without personal data');
    expect(container).toHaveTextContent('No data is sold or used for advertising');
  });

  it('should name no service provider and no storage key', () => {
    const { container } = render(<PrivacyPage />);

    expect(container.textContent).not.toMatch(/vercel|sentry|google|cloud run|eco-metrics-theme/i);
  });

  it('should link to the public repository safely', () => {
    render(<PrivacyPage />);

    const link = screen.getByRole('link', { name: 'GitHub issue' });
    expect(link).toHaveAttribute('href', 'https://github.com/maf248/eco-metrics-earth/issues');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should show the fixed last updated date', () => {
    const { container } = render(<PrivacyPage />);

    const time = container.querySelector('time');
    expect(PRIVACY_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(time).toHaveAttribute('dateTime', PRIVACY_LAST_UPDATED);
    expect(time).toHaveTextContent('Nov 28, 2026');
  });

  it('should make no compliance or legal claims', () => {
    const { container } = render(<PrivacyPage />);

    expect(container.textContent).not.toMatch(/gdpr|compliant|legal advice/i);
  });

  it('should read no BFF data and not opt into request-time rendering', () => {
    expect(SOURCE).not.toMatch(/bffFetch|dataSources/);
    expect(SOURCE).not.toContain('connection(');
  });

  it('should declare title, description, canonical and social metadata', () => {
    expect(metadata.title).toBe('Privacy');
    expect(metadata.description).toEqual(expect.any(String));
    expect(metadata.description).not.toBe(layoutMetadata.description);
    expect(metadata.alternates?.canonical).toMatch(/\/privacy\/$/);
    expect(metadata.openGraph).toMatchObject({
      title: 'Privacy',
      url: expect.stringMatching(/\/privacy\/$/),
      images: [OG_IMAGE],
    });
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'Privacy',
    });
    expect(metadata.robots).toBeUndefined();
  });
});

import type { Metadata } from 'next';

import { formatUtcDate } from '@/lib/formatUtcDate';
import { LINK_CLASS_NAME } from '@/lib/linkClassName';
import { PAGE_TITLE_CLASS_NAME } from '@/lib/pageTitleClassName';
import { PRIVACY_LAST_UPDATED } from '@/lib/privacyPolicy';
import { siteUrl } from '@/lib/siteUrl';
import { buildOpenGraph, buildTwitter } from '@/lib/socialMetadata';

const TITLE = 'Privacy';
const DESCRIPTION =
  'What eco-metrics earth stores on your device and what it measures: no cookies, no accounts, and only aggregate, anonymous measurement.';
const ISSUES_URL = 'https://github.com/maf248/eco-metrics-earth/issues';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${siteUrl()}/privacy/` },
  openGraph: buildOpenGraph({
    title: TITLE,
    description: DESCRIPTION,
    url: `${siteUrl()}/privacy/`,
  }),
  twitter: buildTwitter({ title: TITLE, description: DESCRIPTION }),
};

const H2_CLASS_NAME = 'text-2xl font-semibold text-fg';
const P_CLASS_NAME = 'mt-4 text-fg-body';

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-header">
      <div className="mt-14 space-y-10 pb-8 lg:mt-0">
        <header>
          <h1 className={PAGE_TITLE_CLASS_NAME}>Privacy</h1>
          <p className="mt-4 text-fg-secondary">
            This site collects as little as possible. Here is what it stores and measures, in plain
            words.
          </p>
          <p className="mt-2 text-sm text-fg-muted">
            Last updated:{' '}
            <time dateTime={PRIVACY_LAST_UPDATED}>{formatUtcDate(PRIVACY_LAST_UPDATED)}</time>
          </p>
        </header>

        <section aria-labelledby="device-heading">
          <h2 id="device-heading" className={H2_CLASS_NAME}>
            On your device
          </h2>
          <p className={P_CLASS_NAME}>
            The site sets no cookies. It only remembers your light or dark theme choice in your
            browser, and that preference never leaves your device. There are no accounts and no
            forms.
          </p>
        </section>

        <section aria-labelledby="measurement-heading">
          <h2 id="measurement-heading" className={H2_CLASS_NAME}>
            What is measured
          </h2>
          <p className={P_CLASS_NAME}>
            Visits are counted in aggregate: pages viewed, the referring site, country, and browser,
            operating system and device type. Page speed is measured on a sample of visits. Neither
            uses cookies, identifies you or follows you across days or sites.
          </p>
          <p className={P_CLASS_NAME}>
            Like any website, the services that host it keep standard request logs, and unexpected
            errors are reported without personal data so they can be fixed. No data is sold or used
            for advertising.
          </p>
        </section>

        <section aria-labelledby="questions-heading">
          <h2 id="questions-heading" className={H2_CLASS_NAME}>
            Questions
          </h2>
          <p className={P_CLASS_NAME}>
            The project is public. Questions or concerns can be opened as a{' '}
            <a
              href={ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASS_NAME}
            >
              GitHub issue
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}

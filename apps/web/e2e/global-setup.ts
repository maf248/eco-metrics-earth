import type { FullConfig } from '@playwright/test';

import { categoryPage, dataSourcesPage, LIVE_CATEGORY_SLUGS } from './utils/pages';

/** Generous: a cold `next dev` compiles each page on its first request. */
const WARM_UP_TIMEOUT_MS = 120_000;

const WARM_UP_PATHS = [
  ...LIVE_CATEGORY_SLUGS.map((slug) => categoryPage(slug).url),
  dataSourcesPage.url,
];

function log(message: string): void {
  process.stdout.write(`[e2e-warm-up] ${message}\n`);
}

async function warmUp(baseURL: string, path: string): Promise<void> {
  const start = Date.now();
  try {
    const response = await fetch(new URL(path, baseURL), {
      signal: AbortSignal.timeout(WARM_UP_TIMEOUT_MS),
    });
    await response.arrayBuffer();
    log(`${path} ${response.status} in ${Date.now() - start} ms`);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    log(`${path} failed after ${Date.now() - start} ms: ${reason}`);
  }
}

/**
 * Renders every live page once before the first test. Each E2E shard starts its own `next dev`,
 * which compiles a page on its first request; without this, a shard whose first visit to a live
 * page is a client navigation waits for that compilation inside a 5 s assertion. Best effort: a
 * failure is logged and the page's own tests report it.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) {
    log('no baseURL configured, skipping');
    return;
  }
  const start = Date.now();
  await Promise.all(WARM_UP_PATHS.map((path) => warmUp(baseURL, path)));
  log(`${WARM_UP_PATHS.length} pages in ${Date.now() - start} ms`);
}

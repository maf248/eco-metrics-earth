import Link from 'next/link';

import { SiteLogoIcon } from '@/components/icons';
import { LINK_CLASS_NAME } from '@/lib/linkClassName';

export function Footer() {
  return (
    <footer className="border-t border-line px-6 py-8 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 font-mono text-sm font-medium tracking-tight text-accent">
            <SiteLogoIcon aria-hidden className="h-6 w-6 shrink-0 drop-shadow-icon-sm" />
            <span>~ eco-metrics.earth</span>
          </p>
          <p className="mt-2 text-sm text-fg-secondary">Environmental data, made readable.</p>
        </div>
        <p className="font-mono text-sm text-fg-secondary">
          <span aria-hidden="true" className="select-none text-fg-muted">
            {'$ cd '}
          </span>
          {/* The shell prompt is decorative; the accessible name stays plain words. */}
          <Link href="/data-sources/" aria-label="Data sources" className={LINK_CLASS_NAME}>
            data-sources/
          </Link>
        </p>
      </div>
      <p className="mx-auto mt-6 max-w-6xl border-t border-line-subtle pt-4 text-xs text-fg-muted">
        © 2026 eco-metrics earth · by maf248
      </p>
    </footer>
  );
}

Footer.displayName = 'Footer';

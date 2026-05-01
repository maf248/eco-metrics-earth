import Image from 'next/image';

import { SITE_LOGO_ICON } from '@/lib/categoryIcon';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center justify-center w-24 h-24 rounded-2xl bg-white/10 p-4">
          <Image src={SITE_LOGO_ICON} alt="" width={64} height={64} aria-hidden />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white">eco-metrics earth</h1>
          <p className="mt-4 text-gray-400">Environmental metrics dashboard — coming soon.</p>
        </div>
      </div>
    </main>
  );
}

import { composePlugins, withNx } from '@nx/next';
import type { WithNxOptions } from '@nx/next/plugins/with-nx';

/**
 * packages/shared uses moduleResolution: "bundler" (no .js extensions in
 * re-exports), so Turbopack can resolve its TypeScript source directly.
 * withNx adds it to transpilePackages automatically, enabling full HMR.
 *
 * Note: no WATCHPACK_POLLING needed — the repo lives on the WSL2 ext4
 * filesystem (/home/...) where inotify works natively.
 */
const baseConfig: WithNxOptions = {
  trailingSlash: true,
  nx: {},
};

export default composePlugins(withNx)(baseConfig);

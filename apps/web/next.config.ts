import { composePlugins, withNx } from '@nx/next';
import type { WithNxOptions } from '@nx/next/plugins/with-nx';

/**
 * packages/shared uses moduleResolution: "bundler" (no .js extensions in
 * re-exports), so Turbopack can resolve its TypeScript source directly.
 * withNx adds it to transpilePackages automatically, enabling full HMR.
 */
const baseConfig: WithNxOptions = {
  trailingSlash: true,
  nx: {},
};

export default composePlugins(withNx)(baseConfig);

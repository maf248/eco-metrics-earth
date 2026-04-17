import { composePlugins, withNx } from '@nx/next';
import type { WithNxOptions } from '@nx/next/plugins/with-nx';
import type { NextConfig } from 'next';

/**
 * Plugin that runs AFTER withNx and removes @eco-metrics/shared from
 * transpilePackages.
 *
 * Why: withNx automatically adds every NX workspace dependency to
 * transpilePackages (Next.js 13.1+ behaviour). When a package is in
 * transpilePackages, Next.js/Turbopack resolves it to its TypeScript source
 * via the tsconfig path alias — bypassing the package's own package.json
 * `exports` field. packages/shared/src/index.ts uses explicit `.js`
 * extensions in its re-exports (required by `moduleResolution: "nodenext"`),
 * which Turbopack cannot find in the source directory.
 *
 * The tsconfig path alias in apps/web/tsconfig.json now points to
 * packages/shared/dist/index.js (compiled output) so Turbopack can follow
 * the re-exports correctly. This plugin ensures the package is also excluded
 * from transpilePackages so Next.js does not override that resolution.
 */
function withoutSharedTranspile(config: NextConfig): NextConfig {
  return {
    ...config,
    transpilePackages: (config.transpilePackages ?? []).filter(
      (pkg) => pkg !== '@eco-metrics/shared',
    ),
  };
}

const baseConfig: WithNxOptions = {
  nx: {},
};

export default composePlugins(withNx, withoutSharedTranspile)(baseConfig);

/**
 * Vercel Web Analytics and Speed Insights render only on a Vercel production deployment.
 * `VERCEL_ENV` is a Vercel system variable (`production`, `preview` or `development`); it is
 * unset locally, in Jest and in E2E, where the `/_vercel/*` scripts do not exist.
 */
export function analyticsEnabled(
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return env.VERCEL_ENV === 'production';
}

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const WORKFLOW = readFileSync(
  join(__dirname, '../../../../.github/workflows/deploy-api.yml'),
  'utf8',
);

/** The text of one workflow step, from its `- name:` line to the next step. */
function stepText(name: string): string {
  const start = WORKFLOW.indexOf(`- name: ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = WORKFLOW.indexOf('\n      - name:', start + 1);
  return WORKFLOW.slice(start, next === -1 ? undefined : next);
}

describe('deploy-api.yml Sentry configuration', () => {
  const sentryStep = stepText('Prepare Sentry env values for deploy-cloudrun');

  it('should emit the three variables only inside the conditional step', () => {
    expect(sentryStep).toContain('if [ -n "$SENTRY_DSN" ]; then');
    for (const line of [
      'dsn=SENTRY_DSN=',
      'environment=SENTRY_ENVIRONMENT=',
      'release=SENTRY_RELEASE=',
    ]) {
      expect(sentryStep).toContain(line);
    }
  });

  it('should pass the deploy target as environment and the commit SHA as release', () => {
    expect(sentryStep).toContain('SENTRY_ENVIRONMENT: ${{ inputs.target }}');
    expect(sentryStep).toContain('SENTRY_RELEASE: ${{ github.sha }}');
  });

  it('should reach Cloud Run only through the step outputs', () => {
    const deployStep = stepText('Deploy to Cloud Run');
    expect(deployStep).toContain('${{ steps.sentry.outputs.dsn }}');
    expect(deployStep).toContain('${{ steps.sentry.outputs.environment }}');
    expect(deployStep).toContain('${{ steps.sentry.outputs.release }}');
    expect(deployStep).not.toMatch(/^\s+SENTRY_(DSN|ENVIRONMENT|RELEASE)=/m);
  });

  it('should read the optional repository variable without making it required', () => {
    const targetStep = stepText('Resolve deploy target and pre-flight checks');
    expect(targetStep).toContain('SENTRY_DSN_API: ${{ vars.SENTRY_DSN_API }}');
  });

  it('should never reference a Sentry auth token', () => {
    expect(WORKFLOW).not.toContain('SENTRY_AUTH_TOKEN');
  });
});

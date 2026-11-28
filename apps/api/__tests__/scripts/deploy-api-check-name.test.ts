import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const WORKFLOWS = join(__dirname, '../../../../.github/workflows');
const CI = readFileSync(join(WORKFLOWS, 'ci.yml'), 'utf8');
const DEPLOY = readFileSync(join(WORKFLOWS, 'deploy-api.yml'), 'utf8');

const FULL_CHECK_NAME = 'Deploy API (production) / Build and deploy API to Cloud Run (production)';

/** The text of one top-level job, from its key line to the next job key. */
function jobText(workflow: string, key: string): string {
  const start = workflow.indexOf(`\n  ${key}:\n`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = workflow.slice(start + 1).search(/\n {2}[a-z][\w-]*:\n/);
  return next === -1 ? workflow.slice(start) : workflow.slice(start, start + 1 + next);
}

/** The text of one workflow step, from its `- name:` line to the next step. */
function stepText(name: string): string {
  const start = DEPLOY.indexOf(`- name: ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = DEPLOY.indexOf('\n      - name:', start + 1);
  return DEPLOY.slice(start, next === -1 ? undefined : next);
}

function field(text: string, pattern: RegExp): string {
  const match = pattern.exec(text);
  expect(match).not.toBeNull();
  return (match as RegExpExecArray)[1].trim();
}

describe('API production deploy check name contract', () => {
  const callerJob = jobText(CI, 'deploy-api-production');
  const reusableJob = jobText(DEPLOY, 'deploy');

  it('should compose the documented Vercel check name from both workflow files', () => {
    const callerName = field(callerJob, /^ {4}name: (.+)$/m);
    const target = field(callerJob, /^ {6}target: (.+)$/m);
    const template = field(reusableJob, /^ {4}name: (.+)$/m);

    const reusableName = template.replace('${{ inputs.target }}', target);
    expect(`${callerName} / ${reusableName}`).toBe(FULL_CHECK_NAME);
  });

  it('should call the reusable workflow from the production caller job', () => {
    expect(callerJob).toContain('uses: ./.github/workflows/deploy-api.yml');
  });

  it('should wait for CI so a failed CI leaves the check unreported', () => {
    expect(callerJob).toMatch(/needs: \[ci, /);
  });

  it('should carry a contract comment above the caller job in ci.yml', () => {
    const start = CI.indexOf('\n  deploy-api-production:\n');
    const before = CI.slice(0, start);
    expect(before).toContain(`\`${FULL_CHECK_NAME}\``);
    expect(before.slice(-700)).toContain('docs/deploy/vercel.md');
    expect(before.slice(-700)).toContain('deploy-api.yml');
  });

  it('should carry a contract comment above the reusable job in deploy-api.yml', () => {
    const start = DEPLOY.indexOf('\n  deploy:\n');
    const before = DEPLOY.slice(0, start);
    expect(before).toContain(`\`${FULL_CHECK_NAME}\``);
    expect(before.slice(-700)).toContain('docs/deploy/vercel.md');
    expect(before.slice(-700)).toContain('ci.yml');
  });
});

describe('deploy-api.yml traffic verification step', () => {
  const step = stepText('Verify the new revision serves traffic');

  it('should run only when a deploy happened', () => {
    expect(step).toContain("if: steps.detect.outputs.deploy == 'true'");
  });

  it('should be the last step, after the deployed URL is shown', () => {
    expect(DEPLOY.indexOf('- name: Show deployed URL')).toBeLessThan(
      DEPLOY.indexOf('- name: Verify the new revision serves traffic'),
    );
    const stepNames = [...DEPLOY.matchAll(/^ {6}- name: (.+)$/gm)].map((match) => match[1]);
    expect(stepNames.at(-1)).toBe('Verify the new revision serves traffic');
  });

  it('should pass values through env and never interpolate expressions in the script', () => {
    const script = step.slice(step.indexOf('run: |'));
    expect(script).not.toContain('${{');
    for (const name of ['SERVICE', 'GCP_REGION', 'GCP_PROJECT_ID', 'IMAGE', 'URL']) {
      expect(step).toContain(`${name}: \${{`);
    }
  });

  it('should fail on any error and print the traffic fix', () => {
    expect(step).toContain('set -euo pipefail');
    expect(step).toContain('gcloud run services update-traffic $SERVICE');
    expect(step).toContain('--to-latest');
    expect(step).toContain('select(.latestRevision == true or .revisionName == $rev)');
  });

  it('should check the health route with bounded retries', () => {
    expect(step).toContain('--retry 3');
    expect(step).toContain('--max-time 10');
    expect(step).toContain('"$URL/api/v1/health"');
  });

  it('should read the revision state with gcloud after the authentication step', () => {
    const authIndex = DEPLOY.indexOf('- name: Authenticate to Google Cloud');
    expect(authIndex).toBeGreaterThanOrEqual(0);
    expect(authIndex).toBeLessThan(
      DEPLOY.indexOf('- name: Verify the new revision serves traffic'),
    );
    expect(step).toContain('gcloud run services describe "$SERVICE"');
    expect(step).toContain('--format=json');
  });

  it('should call no provider endpoint, only the service health route', () => {
    const script = step.slice(step.indexOf('run: |'));
    expect(script.match(/\bcurl\b/g)).toHaveLength(1);
    expect(script).toContain('"$URL/api/v1/health"');
    expect(script).not.toMatch(/https?:\/\//);
  });
});

describe('deploy-api.yml deploy gating and concurrency', () => {
  const reusableJob = jobText(DEPLOY, 'deploy');

  it('should skip every step after change detection unless the deploy output is true', () => {
    const detectStart = DEPLOY.indexOf('- name: Detect api-affecting changes');
    expect(detectStart).toBeGreaterThanOrEqual(0);
    const later = DEPLOY.slice(detectStart + 1)
      .split('\n      - name:')
      .slice(1);

    expect(later.length).toBeGreaterThan(0);
    for (const text of later) {
      expect(text).toContain("if: steps.detect.outputs.deploy == 'true'");
    }
  });

  it('should replace waiting runs per target and never cancel a running deploy', () => {
    const group = field(reusableJob, /^ {6}group: (.+)$/m);
    expect(group.replace('${{ inputs.target }}', 'production')).toBe('deploy-api-production');
    expect(reusableJob).toContain('cancel-in-progress: false');
  });

  it('should cancel superseded verification jobs only off main', () => {
    for (const key of ['checks', 'e2e']) {
      expect(jobText(CI, key)).toContain(
        "cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}",
      );
    }
  });

  it('should keep the gate job the deploys need out of any cancellation group', () => {
    expect(jobText(CI, 'ci')).not.toMatch(/^ {4}concurrency:/m);
  });
});

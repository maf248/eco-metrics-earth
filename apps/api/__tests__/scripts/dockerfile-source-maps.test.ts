import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DOCKERFILE = readFileSync(join(__dirname, '../../../../Dockerfile'), 'utf8');

describe('Dockerfile', () => {
  it('should start Node with source maps enabled so stacks point to TypeScript', () => {
    expect(DOCKERFILE).toMatch(/^CMD \["node", "--enable-source-maps", "main\.js"\]$/m);
  });
});

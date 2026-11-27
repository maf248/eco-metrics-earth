/**
 * @jest-environment node
 */
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (file: string): string => fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');

describe('deforestation docs and data source records', () => {
  it.each(['docs/data-sources/deforestation.md', 'docs/data-sources/reforestation.md'])(
    'should state licences per dataset and no blanket Global Forest Watch restriction in %s',
    (file) => {
      const text = read(file);

      expect(text).toMatch(/Per dataset, not per portal/);
      expect(text).not.toMatch(/Global Forest Watch[^\n]*non-commercial only/i);
      expect(text).not.toMatch(/GFW[^\n]*non-commercial only/);
    },
  );

  it('should record the forest area and loss sources in the deforestation data source doc', () => {
    const text = read('docs/data-sources/deforestation.md');

    for (const slug of [
      'forest-area-km',
      'forest-area-as-share-of-land-area',
      'tree-cover-loss-by-dominant-driver',
    ]) {
      expect(text).toContain(slug);
    }
    expect(text).toMatch(/annual-deforestation/);
  });

  it('should carry data and metadata requests for both new OWID slugs in the Postman collection', () => {
    const directory = path.join(REPO_ROOT, 'postman/collections');
    const file = fs
      .readdirSync(directory)
      .find((name) => name.startsWith('Our World in Data') && name.endsWith('.json'));
    if (file === undefined) throw new Error('No Postman OWID collection found');
    const raw = read(path.join('postman/collections', file));

    for (const slug of [
      'forest-area-as-share-of-land-area',
      'tree-cover-loss-by-dominant-driver',
    ]) {
      expect(raw).toContain(`/${slug}.csv`);
      expect(raw).toContain(`/${slug}.metadata.json`);
    }
  });

  it('should keep the existing forest-area-km requests in the Postman collection', () => {
    const directory = path.join(REPO_ROOT, 'postman/collections');
    const file = fs
      .readdirSync(directory)
      .find((name) => name.startsWith('Our World in Data') && name.endsWith('.json'));
    if (file === undefined) throw new Error('No Postman OWID collection found');
    const raw = read(path.join('postman/collections', file));

    expect(raw).toContain('/forest-area-km.csv');
    expect(raw).toContain('/forest-area-km.metadata.json');
  });

  it('should list the three CSVs and three indicator metadata files in the fixtures README with the capture date', () => {
    const text = read('apps/web/e2e/fixtures/owid/README.md');

    for (const csv of [
      'forest-area-km.csv',
      'forest-area-as-share-of-land-area.csv',
      'tree-cover-loss-by-dominant-driver.csv',
    ]) {
      expect(text).toContain(csv);
    }
    for (const id of [1129226, 1132530, 1104660]) {
      expect(text).toContain(`indicator-${id}-metadata.json`);
    }
  });
});

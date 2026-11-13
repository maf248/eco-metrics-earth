import { Injectable, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { LiveDataSource, StaticDataSource } from '@eco-metrics/shared';

import {
  DataSourceContribution,
  DataSourceContributor,
} from '../../src/modules/data-sources/data-source-contributor';
import { DataSourcesModule } from '../../src/modules/data-sources/data-sources.module';
import { DataSourcesService } from '../../src/modules/data-sources/data-sources.service';

const dataset = (id: string, citations: string[] = []): StaticDataSource => ({
  id,
  name: id,
  description: `${id} dataset`,
  categories: ['water-footprint'],
  publications: citations.map((citation) => ({
    citation,
    url: `https://example.org/${citation}`,
    publishedYear: 2020,
    entryCount: 1,
  })),
});

const provider = (id: string, overrides: Partial<LiveDataSource> = {}): LiveDataSource => ({
  id,
  description: `${id} provider`,
  categories: ['co2-emissions'],
  provider: id,
  license: 'CC BY 4.0',
  sourceUrl: `https://${id}.example`,
  lastUpdated: '2024-01-15T00:00:00.000Z',
  lastUpdatedBasis: 'provider',
  origins: [],
  ...overrides,
});

/** Builds a decorated contributor provider returning the given contributions. */
function contributorModule(...contributions: DataSourceContribution[]): new () => object {
  @DataSourceContributor()
  @Injectable()
  class TestContributor {
    getDataSources(): DataSourceContribution[] {
      return contributions;
    }
  }

  @Module({ providers: [TestContributor] })
  class TestContributorModule {}

  return TestContributorModule;
}

async function createService(
  ...modules: Array<new () => object>
): Promise<{ module: TestingModule; service: DataSourcesService }> {
  const module = await Test.createTestingModule({
    imports: [DataSourcesModule, ...modules],
  }).compile();

  return { module, service: module.get(DataSourcesService) };
}

describe('DataSourcesService', () => {
  it('should discover a decorated provider', async () => {
    const { service } = await createService(
      contributorModule({ kind: 'dataset', source: dataset('a') }),
    );

    expect((await service.getCatalog()).datasets).toEqual([dataset('a')]);
  });

  it('should ignore a provider that has getDataSources but no decorator', async () => {
    const getDataSources = jest.fn();

    @Injectable()
    class Undecorated {
      getDataSources = getDataSources;
    }

    @Module({ providers: [Undecorated] })
    class UndecoratedModule {}

    const { service } = await createService(UndecoratedModule);

    await expect(service.getCatalog()).resolves.toEqual({ providers: [], datasets: [] });
    expect(getDataSources).not.toHaveBeenCalled();
  });

  it('should partition contributions by kind', async () => {
    const { service } = await createService(
      contributorModule(
        { kind: 'provider', source: provider('p') },
        { kind: 'dataset', source: dataset('d') },
      ),
    );

    const catalog = await service.getCatalog();

    expect(catalog.providers.map(({ id }) => id)).toEqual(['p']);
    expect(catalog.datasets.map(({ id }) => id)).toEqual(['d']);
  });

  it('should sort sources by id and publications by citation, identically on every call', async () => {
    const { service } = await createService(
      contributorModule(
        { kind: 'dataset', source: dataset('b', ['Zed (2020)', 'Alpha (2020)']) },
        { kind: 'provider', source: provider('y') },
        { kind: 'dataset', source: dataset('a') },
        { kind: 'provider', source: provider('x') },
      ),
    );

    const first = await service.getCatalog();

    expect(first.providers.map(({ id }) => id)).toEqual(['x', 'y']);
    expect(first.datasets.map(({ id }) => id)).toEqual(['a', 'b']);
    expect(first.datasets[1].publications.map(({ citation }) => citation)).toEqual([
      'Alpha (2020)',
      'Zed (2020)',
    ]);
    expect(await service.getCatalog()).toEqual(first);
  });

  it('should keep the timestamp and basis a live provider declares', async () => {
    const { service } = await createService(
      contributorModule(
        { kind: 'provider', source: provider('p', { lastUpdatedBasis: 'provider' }) },
        {
          kind: 'provider',
          source: provider('r', {
            lastUpdated: '2024-02-01T08:00:00.000Z',
            lastUpdatedBasis: 'retrieval',
          }),
        },
      ),
    );

    const [p, r] = (await service.getCatalog()).providers;

    expect(p).toMatchObject({
      lastUpdated: '2024-01-15T00:00:00.000Z',
      lastUpdatedBasis: 'provider',
    });
    expect(r).toMatchObject({
      lastUpdated: '2024-02-01T08:00:00.000Z',
      lastUpdatedBasis: 'retrieval',
    });
  });

  it('should return an empty catalog when there are no contributors', async () => {
    const { service } = await createService();

    await expect(service.getCatalog()).resolves.toEqual({ providers: [], datasets: [] });
  });

  it('should reject duplicate ids and name the id', async () => {
    const { service } = await createService(
      contributorModule(
        { kind: 'dataset', source: dataset('x') },
        { kind: 'provider', source: provider('x') },
      ),
    );

    await expect(service.getCatalog()).rejects.toThrow('Duplicate data source id "x"');
  });

  it('should reject a publication that has both a publisher and a license, naming it', async () => {
    const both: StaticDataSource = {
      ...dataset('both'),
      publications: [
        {
          citation: 'Author (2020), Dataset',
          url: 'https://example.org/dataset',
          publishedYear: 2020,
          entryCount: 1,
          publisher: {
            provider: 'Publisher',
            license: 'CC BY 4.0',
            sourceUrl: 'https://publisher.example',
          },
          license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
        },
      ],
    };
    const { service } = await createService(contributorModule({ kind: 'dataset', source: both }));

    await expect(service.getCatalog()).rejects.toThrow(
      'Data source "both": publication "Author (2020), Dataset" has both a publisher and a license',
    );
  });

  it('should accept a publication with only a license', async () => {
    const licensed: StaticDataSource = {
      ...dataset('licensed'),
      publications: [
        {
          citation: 'Author (2020), Dataset',
          url: 'https://example.org/dataset',
          publishedYear: 2020,
          entryCount: 1,
          license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
        },
      ],
    };
    const { service } = await createService(
      contributorModule({ kind: 'dataset', source: licensed }),
    );

    expect((await service.getCatalog()).datasets).toEqual([licensed]);
  });

  it('should fail application bootstrap on a duplicate id', async () => {
    const module = await Test.createTestingModule({
      imports: [
        DataSourcesModule,
        contributorModule(
          { kind: 'dataset', source: dataset('x') },
          { kind: 'dataset', source: dataset('x') },
        ),
      ],
    }).compile();
    const app = module.createNestApplication({ logger: false });

    await expect(app.init()).rejects.toThrow('Duplicate data source id "x"');
  });

  it('should only list the sources of the modules that are present', async () => {
    const contributor = contributorModule({ kind: 'dataset', source: dataset('a') });
    const { service: withContributor } = await createService(contributor);
    const { service: withoutContributor } = await createService();

    expect((await withContributor.getCatalog()).datasets).toHaveLength(1);
    expect((await withoutContributor.getCatalog()).datasets).toHaveLength(0);
  });
});

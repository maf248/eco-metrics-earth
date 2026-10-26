import { Injectable, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import type { DataSourceOrigin, LiveDataSource } from '@eco-metrics/shared';

import { AppConfigModule } from '../../../src/config/app-config.module';
import { envValidationSchema } from '../../../src/config/env-validation.schema';
import { DataSourcesModule } from '../../../src/modules/data-sources/data-sources.module';
import { DataSourcesService } from '../../../src/modules/data-sources/data-sources.service';
import { OwidProviderStatus } from '../../../src/modules/providers/owid/owid-provider-status';
import { OWID_PUBLISHER } from '../../../src/modules/providers/owid/owid.attribution';
import { OwidModule } from '../../../src/modules/providers/owid/owid.module';

const license = { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' };
const ZETA: DataSourceOrigin = {
  producer: 'Zeta Institute',
  title: 'Zeta data',
  url: 'https://zeta.example',
  license,
};
const ALPHA_B: DataSourceOrigin = { ...ZETA, producer: 'Alpha Lab', title: 'B data' };
const ALPHA_A: DataSourceOrigin = { ...ZETA, producer: 'Alpha Lab', title: 'A data' };

function onlyProvider(status: OwidProviderStatus): LiveDataSource {
  const contributions = status.getDataSources();
  expect(contributions).toHaveLength(1);
  const [contribution] = contributions;
  if (contribution.kind !== 'provider') {
    throw new Error('expected a provider contribution');
  }
  return contribution.source;
}

describe('OwidProviderStatus', () => {
  it('should contribute nothing when no category registered', () => {
    expect(new OwidProviderStatus().getDataSources()).toEqual([]);
  });

  it('should take the attribution from the single OWID definition', () => {
    const status = new OwidProviderStatus();
    status.registerCategory('co2-emissions', []);

    const source = onlyProvider(status);

    expect(source).toEqual(expect.objectContaining({ id: 'owid', ...OWID_PUBLISHER }));
    expect(source.description.length).toBeGreaterThan(0);
  });

  it('should list registered categories sorted and without duplicates', () => {
    const status = new OwidProviderStatus();
    status.registerCategory('global-temperature', []);
    status.registerCategory('co2-emissions', []);
    status.registerCategory('co2-emissions', []);

    expect(onlyProvider(status).categories).toEqual(['co2-emissions', 'global-temperature']);
  });

  it('should prefer the provider timestamp', () => {
    const status = new OwidProviderStatus();
    status.registerCategory('co2-emissions', []);
    status.recordProviderUpdate('2026-10-22T21:47:04.000Z');

    const source = onlyProvider(status);

    expect(source.lastUpdated).toBe('2026-10-22T21:47:04.000Z');
    expect(source.lastUpdatedBasis).toBe('provider');
  });

  it.each([
    ['older then newer', ['2026-09-10T01:10:54.000Z', '2026-10-22T21:47:04.000Z']],
    ['newer then older', ['2026-10-22T21:47:04.000Z', '2026-09-10T01:10:54.000Z']],
  ])('should keep the newest timestamp (%s)', (_label, updates) => {
    const status = new OwidProviderStatus();
    status.registerCategory('co2-emissions', []);
    updates.forEach((update) => status.recordProviderUpdate(update));

    expect(onlyProvider(status).lastUpdated).toBe('2026-10-22T21:47:04.000Z');
  });

  it('should fall back to the retrieval basis before any recorded update', () => {
    const status = new OwidProviderStatus();
    status.registerCategory('co2-emissions', []);

    const source = onlyProvider(status);

    expect(source.lastUpdatedBasis).toBe('retrieval');
    expect(new Date(source.lastUpdated).toISOString()).toBe(source.lastUpdated);
  });

  it('should list origins ordered by producer then title, each with its category', () => {
    const status = new OwidProviderStatus();
    status.registerCategory('co2-emissions', [ZETA]);
    status.registerCategory('global-temperature', [ALPHA_B, ALPHA_A]);

    const { origins } = onlyProvider(status);

    expect(origins.map(({ producer, title }) => `${producer}/${title}`)).toEqual([
      'Alpha Lab/A data',
      'Alpha Lab/B data',
      'Zeta Institute/Zeta data',
    ]);
    expect(origins[0].categories).toEqual(['global-temperature']);
    expect(origins[2].categories).toEqual(['co2-emissions']);
    expect(origins[2].license).toEqual(license);
  });

  it('should merge an origin registered by several categories', () => {
    const status = new OwidProviderStatus();
    status.registerCategory('global-temperature', [ZETA]);
    status.registerCategory('co2-emissions', [ZETA]);

    const { origins } = onlyProvider(status);

    expect(origins).toHaveLength(1);
    expect(origins[0].categories).toEqual(['co2-emissions', 'global-temperature']);
  });

  it('should have no origins when a category registers none', () => {
    const status = new OwidProviderStatus();
    status.registerCategory('co2-emissions', []);

    expect(onlyProvider(status).origins).toEqual([]);
  });

  it('should build the same catalog twice', () => {
    const status = new OwidProviderStatus();
    status.registerCategory('co2-emissions', [ZETA]);
    status.recordProviderUpdate('2026-10-22T21:47:04.000Z');

    expect(status.getDataSources()).toEqual(status.getDataSources());
  });

  it('should produce a single catalog entry for two categories without a duplicate-id error', async () => {
    @Injectable()
    class SecondCategory {
      constructor(status: OwidProviderStatus) {
        status.registerCategory('global-temperature', []);
      }
    }

    @Injectable()
    class FirstCategory {
      constructor(status: OwidProviderStatus) {
        status.registerCategory('co2-emissions', []);
      }
    }

    @Module({ imports: [OwidModule], providers: [FirstCategory, SecondCategory] })
    class CategoriesModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
        AppConfigModule,
        DataSourcesModule,
        CategoriesModule,
      ],
    }).compile();
    await moduleRef.init();

    const catalog = await moduleRef.get(DataSourcesService).getCatalog();

    expect(catalog.providers).toHaveLength(1);
    expect(catalog.providers[0].categories).toEqual(['co2-emissions', 'global-temperature']);
    await moduleRef.close();
  });
});

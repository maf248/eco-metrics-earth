import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test, TestingModule } from '@nestjs/testing';

import { DataSourcesCatalog } from '@eco-metrics/shared';

import { DataSourcesController } from '../../src/modules/data-sources/data-sources.controller';
import { DataSourcesService } from '../../src/modules/data-sources/data-sources.service';

describe('DataSourcesController', () => {
  const catalog: DataSourcesCatalog = { providers: [], datasets: [] };
  const service = { getCatalog: jest.fn().mockResolvedValue(catalog) };
  let controller: DataSourcesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataSourcesController],
      providers: [{ provide: DataSourcesService, useValue: service }],
    }).compile();

    controller = module.get(DataSourcesController);
  });

  it('should return the catalog in the standard envelope', async () => {
    await expect(controller.getDataSources()).resolves.toEqual({
      success: true,
      data: catalog,
      status: 200,
    });
  });

  it('should not include meta', async () => {
    await expect(controller.getDataSources()).resolves.not.toHaveProperty('meta');
  });

  it('should document GET /data-sources under the Data Sources Swagger tag', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataSourcesController],
      providers: [{ provide: DataSourcesService, useValue: service }],
    }).compile();
    const app: INestApplication = module.createNestApplication();
    await app.init();

    try {
      const document = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().setTitle('test').build(),
      );

      expect(document.paths['/data-sources']?.get?.tags).toEqual(['Data Sources']);
      expect(document.paths['/data-sources']?.get?.responses).toHaveProperty('200');
    } finally {
      await app.close();
    }
  });
});

import { Body, Controller, Get, INestApplication, Post, Query } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import supertest from 'supertest';

import { applyGlobalPipeline } from '../../src/app/global-pipeline';

// Test-only DTOs and controller: they live exclusively under __tests__/.
class TestBodyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Type(() => Number)
  value!: number;
}

class TestQueryDto {
  @IsNumber()
  @Type(() => Number)
  limit!: number;
}

@Controller('pipeline-test')
class PipelineTestController {
  @Post()
  create(@Body() body: TestBodyDto) {
    return {
      isInstance: body instanceof TestBodyDto,
      valueType: typeof body.value,
      body,
    };
  }

  @Get()
  list(@Query() query: TestQueryDto) {
    return { isInstance: query instanceof TestQueryDto, limitType: typeof query.limit };
  }
}

describe('applyGlobalPipeline', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PipelineTestController],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    applyGlobalPipeline(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return a 400 ApiResponse with joined messages when required fields are missing', async () => {
    const response = await supertest(app.getHttpServer()).post('/pipeline-test').send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: expect.any(String),
      status: 400,
    });
    expect(response.body.error).toContain('name');
    expect(response.body.error).toContain('value');
    expect(response.body.error).toContain('; ');
  });

  it('should reject properties not declared in the DTO (forbidNonWhitelisted)', async () => {
    const response = await supertest(app.getHttpServer())
      .post('/pipeline-test')
      .send({ name: 'co2', value: 1, extra: 'nope' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('extra');
  });

  it('should transform the body into a DTO instance with coerced types (transform)', async () => {
    const response = await supertest(app.getHttpServer())
      .post('/pipeline-test')
      .send({ name: 'co2', value: '415.7' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      isInstance: true,
      valueType: 'number',
      body: { name: 'co2', value: 415.7 },
    });
  });

  it('should transform the query into a DTO instance with coerced types (transform)', async () => {
    const response = await supertest(app.getHttpServer()).get('/pipeline-test?limit=10');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ isInstance: true, limitType: 'number' });
  });

  it('should return a 400 ApiResponse when a query value is invalid', async () => {
    const response = await supertest(app.getHttpServer()).get('/pipeline-test?limit=abc');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: expect.any(String),
      status: 400,
    });
  });
});

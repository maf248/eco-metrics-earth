import { validate } from 'class-validator';

import { GetMetricsQueryDto } from '../../../src/common/dto/get-metrics-query.dto';

describe('GetMetricsQueryDto', () => {
  describe('valid inputs', () => {
    it('should accept a valid ISO date for fromDate', async () => {
      const dto = Object.assign(new GetMetricsQueryDto(), {
        fromDate: '2025-01-15',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept a valid ISO datetime for fromDate', async () => {
      const dto = Object.assign(new GetMetricsQueryDto(), {
        fromDate: '2025-01-15T10:30:00.000Z',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept a valid ISO date for toDate', async () => {
      const dto = Object.assign(new GetMetricsQueryDto(), {
        toDate: '2025-12-31',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept a valid category string', async () => {
      const dto = Object.assign(new GetMetricsQueryDto(), {
        category: 'air-quality',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept all optional fields together', async () => {
      const dto = Object.assign(new GetMetricsQueryDto(), {
        fromDate: '2025-01-01',
        toDate: '2025-12-31',
        category: 'water',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept an empty object (all fields are optional)', async () => {
      const dto = new GetMetricsQueryDto();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('invalid inputs', () => {
    it('should fail when fromDate is not a valid date string', async () => {
      const dto = Object.assign(new GetMetricsQueryDto(), {
        fromDate: 'not-a-date',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('fromDate');
    });

    it('should fail when toDate is not a valid date string', async () => {
      const dto = Object.assign(new GetMetricsQueryDto(), {
        toDate: 'hello-world',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('toDate');
    });
  });
});

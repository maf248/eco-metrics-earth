import 'reflect-metadata';

import { validate } from 'class-validator';

import { CreateMetricDto } from '../../../src/common/dto/create-metric.dto';

describe('CreateMetricDto', () => {
  describe('valid inputs', () => {
    it('should accept a valid payload with all required fields', async () => {
      const dto = Object.assign(new CreateMetricDto(), {
        name: 'PM2.5',
        value: 12.5,
        unit: 'µg/m³',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept an integer value', async () => {
      const dto = Object.assign(new CreateMetricDto(), {
        name: 'PM2.5',
        value: 42,
        unit: 'µg/m³',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('invalid inputs', () => {
    it('should fail when name is empty', async () => {
      const dto = Object.assign(new CreateMetricDto(), {
        name: '',
        value: 10,
        unit: 'µg/m³',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'name')).toBe(true);
    });

    it('should fail when name is missing', async () => {
      const dto = Object.assign(new CreateMetricDto(), {
        value: 10,
        unit: 'µg/m³',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'name')).toBe(true);
    });

    it('should fail when value is a string', async () => {
      const dto = Object.assign(new CreateMetricDto(), {
        name: 'PM2.5',
        value: 'not-a-number',
        unit: 'µg/m³',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'value')).toBe(true);
    });

    it('should fail when unit is empty', async () => {
      const dto = Object.assign(new CreateMetricDto(), {
        name: 'PM2.5',
        value: 10,
        unit: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'unit')).toBe(true);
    });

    it('should fail when unit is missing', async () => {
      const dto = Object.assign(new CreateMetricDto(), {
        name: 'PM2.5',
        value: 10,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'unit')).toBe(true);
    });
  });
});

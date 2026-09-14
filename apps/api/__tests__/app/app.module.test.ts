import { Test, TestingModule } from '@nestjs/testing';

jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs') as typeof import('fs');
  return {
    ...actualFs,
    readFileSync: jest.fn((path: string | Buffer | URL, options?: BufferEncoding | null) => {
      if (String(path).endsWith('data/water-footprint.json')) {
        return '[]';
      }
      return options === undefined
        ? actualFs.readFileSync(path)
        : actualFs.readFileSync(path, options);
    }) as typeof actualFs.readFileSync,
  };
});

import { AppModule } from '../../src/app/app.module';

describe('AppModule', () => {
  it('should compile successfully', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(module).toBeDefined();
  });
});

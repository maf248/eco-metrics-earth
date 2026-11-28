import * as Sentry from '@sentry/nextjs';

import {
  createSectionFailureReporter,
  SECTION_REPORT_WINDOW_MS,
} from '@/lib/sectionFailureReporter';

jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));

describe('createSectionFailureReporter', () => {
  let now = 0;
  const report = () => createSectionFailureReporter(() => now);

  beforeEach(() => {
    now = 1_000;
    jest.mocked(Sentry.captureException).mockClear();
  });

  it('should report a failure tagged with its section', () => {
    const error = new Error('BFF down');
    report()('ph', error);

    expect(Sentry.captureException).toHaveBeenCalledWith(error, { tags: { section: 'ph' } });
  });

  it('should report a section once within the window', () => {
    const reporter = report();
    reporter('ph', new Error('first'));
    now += SECTION_REPORT_WINDOW_MS - 1;
    reporter('ph', new Error('again'));

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('should report the section again once the window has passed', () => {
    const reporter = report();
    reporter('ph', new Error('first'));
    now += SECTION_REPORT_WINDOW_MS;
    reporter('ph', new Error('again'));

    expect(Sentry.captureException).toHaveBeenCalledTimes(2);
  });

  it('should throttle each section on its own', () => {
    const reporter = report();
    reporter('ph', new Error('ph down'));
    reporter('heat', new Error('heat down'));

    expect(Sentry.captureException).toHaveBeenCalledTimes(2);
  });
});

import { formatLevel, levelToSeverity } from '../../../src/common/logging/severity';

describe('levelToSeverity', () => {
  it.each([
    ['trace', 'DEBUG'],
    ['debug', 'DEBUG'],
    ['info', 'INFO'],
    ['warn', 'WARNING'],
    ['error', 'ERROR'],
    ['fatal', 'CRITICAL'],
  ])('should map the pino level %s to %s', (label, severity) => {
    expect(levelToSeverity(label)).toBe(severity);
  });

  it('should fall back to INFO for an unknown label', () => {
    expect(levelToSeverity('custom')).toBe('INFO');
  });
});

describe('formatLevel', () => {
  it('should return the severity object used by the pino level formatter', () => {
    expect(formatLevel('warn')).toEqual({ severity: 'WARNING' });
  });
});

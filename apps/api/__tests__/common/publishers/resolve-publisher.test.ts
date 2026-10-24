import { resolvePublisher } from '../../../src/common/publishers/resolve-publisher';
import { OWID_PUBLISHER } from '../../../src/modules/providers/owid/owid.attribution';

describe('resolvePublisher', () => {
  it('should resolve Our World in Data for its host', () => {
    expect(resolvePublisher('https://ourworldindata.org/grapher/example')).toBe(OWID_PUBLISHER);
  });

  it('should return undefined for a host without a known licensor', () => {
    expect(resolvePublisher('https://doi.org/10.1126/science.aaq0216')).toBeUndefined();
  });

  it.each(['constructor', '__proto__', 'toString'])(
    'should not resolve the inherited object key "%s" used as a host',
    (host) => {
      expect(resolvePublisher(`https://${host}/`)).toBeUndefined();
    },
  );

  it('should throw on an unparsable URL', () => {
    expect(() => resolvePublisher('not a url')).toThrow('Invalid URL');
  });
});

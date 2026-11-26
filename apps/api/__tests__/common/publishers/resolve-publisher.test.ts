import {
  COPERNICUS_CLIMATE_PULSE_PUBLISHER,
  NOAA_LSA_PUBLISHER,
} from '../../../src/common/publishers/publishers';
import { resolvePublisher } from '../../../src/common/publishers/resolve-publisher';
import { OWID_PUBLISHER } from '../../../src/modules/providers/owid/owid.attribution';

describe('resolvePublisher', () => {
  it('should resolve Our World in Data for its host', () => {
    expect(resolvePublisher('https://ourworldindata.org/grapher/example')).toBe(OWID_PUBLISHER);
  });

  it.each(['https://pulse.climate.copernicus.eu/', 'https://sites.ecmwf.int/data/climatepulse/'])(
    'should resolve Copernicus Climate Pulse for %s',
    (url) => {
      expect(resolvePublisher(url)).toBe(COPERNICUS_CLIMATE_PULSE_PUBLISHER);
    },
  );

  it('should resolve NOAA LSA for its host', () => {
    expect(resolvePublisher('https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/')).toBe(
      NOAA_LSA_PUBLISHER,
    );
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

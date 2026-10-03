import {
  OwidInvalidParameterError,
  OwidParseError,
  OwidUnsupportedChartError,
} from '../../../src/modules/providers/owid/owid-errors';
import { parseGrapherCsv } from '../../../src/modules/providers/owid/parseGrapherCsv';

describe('parseGrapherCsv', () => {
  it('should parse a single-column CSV into sorted per-entity series', () => {
    const csv = [
      'entity,code,year,co2_per_capita',
      'United States,USA,1992,19.5',
      'Argentina,ARG,1992,3.6',
      'United States,USA,1990,19.8',
      'Argentina,ARG,1990,3.5',
      'United States,USA,1991,19.6',
      'Argentina,ARG,1991,3.4',
    ].join('\n');

    const result = parseGrapherCsv(csv);

    expect(result).toHaveLength(2);
    expect(result[0].entityCode).toBe('ARG');
    expect(result[0].entityName).toBe('Argentina');
    expect(result[0].points).toEqual([
      { year: 1990, value: 3.5 },
      { year: 1991, value: 3.4 },
      { year: 1992, value: 3.6 },
    ]);
    expect(result[1].entityCode).toBe('USA');
    expect(result[1].points).toEqual([
      { year: 1990, value: 19.8 },
      { year: 1991, value: 19.6 },
      { year: 1992, value: 19.5 },
    ]);
  });

  it('should parse a quoted entity name containing a comma', () => {
    const csv = ['entity,code,year,value', '"Asia, excl. China",ASIA_EXCL_CHN,2020,42.5'].join(
      '\n',
    );

    const result = parseGrapherCsv(csv);

    expect(result).toHaveLength(1);
    expect(result[0].entityName).toBe('Asia, excl. China');
    expect(result[0].entityCode).toBe('ASIA_EXCL_CHN');
  });

  it('should handle CRLF line endings without leaving \\r residue', () => {
    const csv = 'entity,code,year,value\r\nArgentina,ARG,2020,1.2\r\n';

    const result = parseGrapherCsv(csv);

    expect(result[0].entityName).toBe('Argentina');
    expect(result[0].points[0].year).toBe(2020);
  });

  it('should map an empty value cell to null', () => {
    const csv = ['entity,code,year,value', 'Argentina,ARG,2020,'].join('\n');

    const result = parseGrapherCsv(csv);

    expect(result[0].points[0]).toEqual({ year: 2020, value: null });
  });

  it('should skip rows with an empty code', () => {
    const csv = [
      'entity,code,year,value',
      'World aggregate,,2020,100',
      'Argentina,ARG,2020,1.2',
    ].join('\n');

    const result = parseGrapherCsv(csv);

    expect(result).toHaveLength(1);
    expect(result[0].entityCode).toBe('ARG');
  });

  it('should throw OwidUnsupportedChartError when there are multiple value columns and no column selection', () => {
    const csv = [
      'entity,code,year,near_surface_temperature_anomaly,near_surface_temperature_anomaly_lower',
      'World,OWID_WRL,1990,0.5,0.3',
    ].join('\n');

    expect(() => parseGrapherCsv(csv)).toThrow(OwidUnsupportedChartError);
    expect(() => parseGrapherCsv(csv)).toThrow('near_surface_temperature_anomaly');
    expect(() => parseGrapherCsv(csv)).toThrow('near_surface_temperature_anomaly_lower');
  });

  it('should map only the selected column when a column is provided', () => {
    const csv = [
      'entity,code,year,near_surface_temperature_anomaly,near_surface_temperature_anomaly_lower',
      'World,OWID_WRL,1990,0.5,0.3',
    ].join('\n');

    const result = parseGrapherCsv(csv, 'near_surface_temperature_anomaly_lower');

    expect(result[0].points[0]).toEqual({ year: 1990, value: 0.3 });
  });

  it('should parse only the selected column values, ignoring malformed cells elsewhere', () => {
    const csv = ['entity,code,year,value,annotation', 'World,OWID_WRL,1990,0.5,n/a'].join('\n');

    expect(parseGrapherCsv(csv, 'value')[0].points[0]).toEqual({ year: 1990, value: 0.5 });
    expect(() => parseGrapherCsv(csv, 'annotation')).toThrow(OwidParseError);
  });

  it('should throw OwidInvalidParameterError when the selected column is not in the header', () => {
    const csv = [
      'entity,code,year,near_surface_temperature_anomaly,near_surface_temperature_anomaly_lower',
      'World,OWID_WRL,1990,0.5,0.3',
    ].join('\n');

    expect(() => parseGrapherCsv(csv, 'missing_column')).toThrow(OwidInvalidParameterError);
    expect(() => parseGrapherCsv(csv, 'missing_column')).toThrow(
      'near_surface_temperature_anomaly',
    );
    expect(() => parseGrapherCsv(csv, 'missing_column')).toThrow(
      'near_surface_temperature_anomaly_lower',
    );
  });

  it('should throw OwidParseError when the header does not start with entity,code,year', () => {
    const csv = 'foo,bar,baz,value\nArgentina,ARG,2020,1.2\n';

    expect(() => parseGrapherCsv(csv)).toThrow(OwidParseError);
  });

  it('should throw OwidParseError on an unterminated quoted field', () => {
    const csv = 'entity,code,year,value\n"Argentina,ARG,2020,1.2\n';

    expect(() => parseGrapherCsv(csv)).toThrow(OwidParseError);
  });

  it('should throw OwidParseError on a ragged row', () => {
    const csv = ['entity,code,year,value', 'Argentina,ARG,2020'].join('\n');

    expect(() => parseGrapherCsv(csv)).toThrow(OwidParseError);
  });
});

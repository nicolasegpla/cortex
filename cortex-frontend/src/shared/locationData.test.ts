import { describe, expect, it } from 'vitest';

import { COUNTRY_CITY_MAP, getCitiesForCountry, resolveCityOptions } from './locationData';

describe('locationData', () => {
    it('contains Colombia and Venezuela with non-empty city lists', () => {
        expect(COUNTRY_CITY_MAP.Colombia.length).toBeGreaterThan(0);
        expect(COUNTRY_CITY_MAP.Venezuela.length).toBeGreaterThan(0);
    });

    it('returns the Colombian department list for Colombia', () => {
        const cities = getCitiesForCountry('Colombia');

        expect(cities).toContain('amazonas');
        expect(cities).toContain('antioquia');
        expect(cities).toContain('norte de santander');
        expect(cities[0]).toBe('amazonas');
    });

    it('returns the Venezuelan city list for Venezuela', () => {
        const cities = getCitiesForCountry('Venezuela');

        expect(cities).toContain('Caracas');
        expect(cities).toContain('Maracaibo');
        expect(cities[0]).toBe('Caracas');
    });

    it('returns an empty array for an unknown country', () => {
        expect(getCitiesForCountry('México')).toEqual([]);
    });

    it('returns catalog cities unchanged when the current city is already in the catalog', () => {
        const cities = resolveCityOptions('Colombia', 'antioquia');

        const antioquiaOccurrences = cities.filter((city) => city === 'antioquia').length;
        expect(antioquiaOccurrences).toBe(1);
        expect(cities).toContain('norte de santander');
    });

    it('appends an unknown legacy city as a transient option', () => {
        const cities = resolveCityOptions('Colombia', 'Palmira');

        expect(cities[0]).toBe('Palmira');
        expect(cities).toContain('amazonas');
        expect(cities).toContain('antioquia');
    });

    it('guards the Colombia catalog against city regressions', () => {
        const cities = getCitiesForCountry('Colombia');

        expect(cities).toHaveLength(33);
        expect(cities).toContain('amazonas');
        expect(cities).toContain('cundinamarca');
        expect(cities).toContain('valle del cauca');
        expect(cities).toContain('santander');
        expect(cities).not.toContain('Medellín');
        expect(cities).not.toContain('Cali');
    });
});

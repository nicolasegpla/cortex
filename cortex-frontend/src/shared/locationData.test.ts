import { describe, expect, it } from 'vitest';

import { COUNTRY_CITY_MAP, getCitiesForCountry, resolveCityOptions } from './locationData';

describe('locationData', () => {
    it('contains Colombia and Venezuela with non-empty city lists', () => {
        expect(COUNTRY_CITY_MAP.Colombia.length).toBeGreaterThan(0);
        expect(COUNTRY_CITY_MAP.Venezuela.length).toBeGreaterThan(0);
    });

    it('returns the Colombian city list for Colombia', () => {
        const cities = getCitiesForCountry('Colombia');

        expect(cities).toContain('Bogotá D.C.');
        expect(cities).toContain('Medellín');
        expect(cities[0]).toBe('Bogotá D.C.');
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
        const cities = resolveCityOptions('Colombia', 'Bogotá D.C.');

        const bogotaOccurrences = cities.filter((city) => city === 'Bogotá D.C.').length;
        expect(bogotaOccurrences).toBe(1);
        expect(cities).toContain('Medellín');
    });

    it('appends an unknown legacy city as a transient option', () => {
        const cities = resolveCityOptions('Colombia', 'Palmira');

        expect(cities[0]).toBe('Palmira');
        expect(cities).toContain('Bogotá D.C.');
        expect(cities).toContain('Medellín');
    });
});

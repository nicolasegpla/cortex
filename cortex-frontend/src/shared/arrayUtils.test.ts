import { describe, expect, it } from 'vitest';

import { joinArray, parseArray } from './arrayUtils';

describe('parseArray', () => {
    it('returns an empty array for an empty string', () => {
        expect(parseArray('')).toEqual([]);
    });

    it('trims whitespace and filters empty items', () => {
        expect(parseArray('  a ,  , b ,  c  ')).toEqual(['a', 'b', 'c']);
    });

    it('returns a single item without commas', () => {
        expect(parseArray('Castillo')).toEqual(['Castillo']);
    });

    it('returns multiple comma-separated items', () => {
        expect(parseArray('Castillo, Caturra, Geisha')).toEqual(['Castillo', 'Caturra', 'Geisha']);
    });
});

describe('joinArray', () => {
    it('returns an empty string for null', () => {
        expect(joinArray(null)).toBe('');
    });

    it('returns an empty string for undefined', () => {
        expect(joinArray(undefined)).toBe('');
    });

    it('returns an empty string for an empty array', () => {
        expect(joinArray([])).toBe('');
    });

    it('joins multiple items with a comma and space', () => {
        expect(joinArray(['Castillo', 'Caturra'])).toBe('Castillo, Caturra');
    });

    it('returns a single item unchanged', () => {
        expect(joinArray(['Geisha'])).toBe('Geisha');
    });
});

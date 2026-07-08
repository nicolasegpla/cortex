import { describe, expect, it } from 'vitest';

import { normalizeFormPayload } from './formUtils';

describe('normalizeFormPayload', () => {
    it('lowercases string values for configured keys', () => {
        const result = normalizeFormPayload({ name: 'Viñedo Real', pais: 'Colombia' }, ['name']);
        expect(result).toEqual({ name: 'viñedo real', pais: 'Colombia' });
    });

    it('lowercases each item in string arrays for configured keys', () => {
        const result = normalizeFormPayload({ tags: ['Castillo', 'Caturra'], pais: 'Colombia' }, ['tags']);
        expect(result).toEqual({ tags: ['castillo', 'caturra'], pais: 'Colombia' });
    });

    it('preserves booleans', () => {
        const result = normalizeFormPayload({ active: true, archived: false }, ['active']);
        expect(result).toEqual({ active: true, archived: false });
    });

    it('preserves numbers', () => {
        const result = normalizeFormPayload({ count: 42, rate: 3.14 }, ['count']);
        expect(result).toEqual({ count: 42, rate: 3.14 });
    });

    it('preserves null and undefined', () => {
        const result = normalizeFormPayload({ a: null, b: undefined }, ['a']);
        expect(result).toEqual({ a: null, b: undefined });
    });

    it('preserves non-string array items', () => {
        const result = normalizeFormPayload({ mixed: [1, 'A', true, null] }, ['mixed']);
        expect(result).toEqual({ mixed: [1, 'a', true, null] });
    });

    it('handles empty strings', () => {
        const result = normalizeFormPayload({ name: '' }, ['name']);
        expect(result).toEqual({ name: '' });
    });

    it('leaves values unchanged when their key is not in the lowercase list', () => {
        const result = normalizeFormPayload({ name: 'Viñedo Real', pais: 'Colombia' }, []);
        expect(result).toEqual({ name: 'Viñedo Real', pais: 'Colombia' });
    });
});

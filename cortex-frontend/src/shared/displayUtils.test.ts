import { describe, expect, it } from 'vitest';

import { formatDisplayValue } from './displayUtils';

describe('formatDisplayValue', () => {
    it('returns lowercase string for mixed case input', () => {
        expect(formatDisplayValue('Viñedo Real')).toBe('viñedo real');
    });

    it('returns dash for null', () => {
        expect(formatDisplayValue(null)).toBe('-');
    });

    it('returns dash for undefined', () => {
        expect(formatDisplayValue(undefined)).toBe('-');
    });

    it('returns dash for empty string', () => {
        expect(formatDisplayValue('')).toBe('-');
    });

    it('returns lowercase string for already lowercase input', () => {
        expect(formatDisplayValue('already lowercase')).toBe('already lowercase');
    });
});

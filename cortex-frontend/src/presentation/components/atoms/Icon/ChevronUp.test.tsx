import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ChevronUp } from './ChevronUp';

describe('ChevronUp', () => {
    it('should render an upward chevron svg', () => {
        render(<ChevronUp data-testid="chevron-up-icon" />);
        const svg = screen.getByTestId('chevron-up-icon');
        expect(svg.tagName.toLowerCase()).toBe('svg');
        expect(svg.querySelector('path')).toHaveAttribute('d', 'm18 15-6-6-6 6');
    });
});

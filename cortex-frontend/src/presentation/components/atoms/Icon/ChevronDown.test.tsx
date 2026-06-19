import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ChevronDown } from './ChevronDown';
import { ChevronDown as ChevronDownFromIndex } from './index';

describe('ChevronDown', () => {
    it('should render an svg chevron-down icon', () => {
        render(<ChevronDown data-testid="chevron-down" />);

        const svg = screen.getByTestId('chevron-down');
        expect(svg).toBeInTheDocument();
        expect(svg.tagName).toBe('svg');
    });

    it('should be exported from the icon index', () => {
        expect(ChevronDownFromIndex).toBe(ChevronDown);
    });
});

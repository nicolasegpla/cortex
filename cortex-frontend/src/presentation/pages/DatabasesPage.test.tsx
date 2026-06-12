import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { DatabasesPage } from '@/presentation/pages/DatabasesPage';

describe('DatabasesPage', () => {
    it('renders the coffee-farms database card as active', () => {
        render(
            <MemoryRouter>
                <DatabasesPage />
            </MemoryRouter>
        );

        const coffeeCard = screen.getByRole('link', { name: /Fincas de café/i });
        expect(coffeeCard).toBeInTheDocument();
        expect(coffeeCard).toHaveAttribute('href', '/coffee-farms');
        expect(within(coffeeCard).queryByText('Próximamente')).not.toBeInTheDocument();
        expect(within(coffeeCard).getByText('Ver tabla →')).toBeInTheDocument();
    });
});

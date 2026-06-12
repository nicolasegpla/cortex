import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { DatabasesPage } from '@/presentation/pages/DatabasesPage';

afterEach(() => {
    cleanup();
});

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

    it('renders the animal-feed database card as active', () => {
        render(
            <MemoryRouter>
                <DatabasesPage />
            </MemoryRouter>
        );

        const animalFeedCard = screen.getByRole('link', { name: /Alimentos para animales/i });
        expect(animalFeedCard).toBeInTheDocument();
        expect(animalFeedCard).toHaveAttribute('href', '/animal-feed-producers');
        expect(within(animalFeedCard).queryByText('Próximamente')).not.toBeInTheDocument();
        expect(within(animalFeedCard).getByText('Ver tabla →')).toBeInTheDocument();
    });

    it('renders the wine-producers database card as active and routes to /wine-producers', () => {
        render(
            <MemoryRouter>
                <DatabasesPage />
            </MemoryRouter>
        );

        const wineCard = screen.getByRole('link', { name: /Productores de vino/i });
        expect(wineCard).toBeInTheDocument();
        expect(wineCard).toHaveAttribute('href', '/wine-producers');
        expect(within(wineCard).queryByText('Próximamente')).not.toBeInTheDocument();
        expect(within(wineCard).getByText('Ver tabla →')).toBeInTheDocument();
    });
});

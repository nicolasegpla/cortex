import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { AnimalFeedProducerList } from './index';

const mockProducers = [
    {
        id: 'producer-1',
        razon_social: 'Nutrición Animal S.A.',
        marca: 'NutriAnimal',
        nit: '800123456',
        direccion: 'Calle 123',
        departamento: 'Antioquia',
        ciudad: 'Medellín',
        pais: 'Colombia',
        nombre_contacto: 'Ana López',
        celular: '3001112222',
        correo: 'ana@nutrianimal.com',
        especies_manejadas: ['Bovinos', 'Porcinos'],
        productos_fabricados: ['Concentrado', 'Premezcla'],
        observaciones: null,
        oportunidades: null,
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
    },
    {
        id: 'producer-2',
        razon_social: 'Alimentos del Campo',
        ciudad: 'Bogotá',
        especies_manejadas: ['Aves'],
        created_at: '2026-06-02T00:00:00Z',
        updated_at: '2026-06-02T00:00:00Z',
    },
];

describe('AnimalFeedProducerList', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.restoreAllMocks();
        cleanup();
    });

    it('renders a table with loaded producers', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockProducers), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <AnimalFeedProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Productores de Alimentos para Animales' })).toBeInTheDocument();
        });

        expect(screen.getByText('Nutrición Animal S.A.')).toBeInTheDocument();
        expect(screen.getByText('Alimentos del Campo')).toBeInTheDocument();
        expect(screen.getByText('Bovinos, Porcinos')).toBeInTheDocument();
        expect(screen.getByText('Aves')).toBeInTheDocument();
    });

    it('shows an empty state when no producers are returned', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify([]), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <AnimalFeedProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('No hay productores de alimentos para animales registrados.')).toBeInTheDocument();
        });
    });

    it('shows an error message when the API request fails', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ detail: 'Service unavailable' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <AnimalFeedProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Error al cargar los productores de alimentos para animales');
        });
    });

    it('removes a producer after confirming deletion', async () => {
        const user = userEvent.setup();
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockProducers), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({}), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            );

        render(
            <MemoryRouter>
                <AnimalFeedProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Nutrición Animal S.A.')).toBeInTheDocument();
        });

        const deleteButton = screen.getAllByRole('button', { name: 'Eliminar' })[0];
        await user.click(deleteButton);

        await waitFor(() => {
            expect(screen.queryByText('Nutrición Animal S.A.')).not.toBeInTheDocument();
        });

        expect(screen.getByText('Alimentos del Campo')).toBeInTheDocument();
    });
});

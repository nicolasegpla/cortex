import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { WineProducerList } from './index';

const mockProducers = [
    {
        id: 'producer-1',
        nombre_comercial: 'Viñedo Real',
        razon_social: 'Viñedo Real S.A.S.',
        nit: '900123456',
        direccion: 'Calle 123',
        ciudad: 'Medellín',
        pais: 'Colombia',
        nombre_contacto: 'Carlos López',
        celular: '3001112222',
        correo: 'carlos@vinedoreal.com',
        marcas: ['Real', 'Reserva'],
        fuente_azucar: 'Uva',
        tipo_uva: ['Cabernet Sauvignon', 'Merlot'],
        tipo_vino: ['Tinto', 'Rosado'],
        levaduras_utilizadas: ['Levadura 1'],
        botellas_utilizadas: ['Botella 750ml'],
        nutrientes_utilizados: ['Nutriente A'],
        conservantes_utilizados: ['Conservante B'],
        clarificantes_utilizados: ['Clarificante C'],
        produccion_anual: '10000 litros',
        observaciones: null,
        oportunidades: null,
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
    },
    {
        id: 'producer-2',
        nombre_comercial: 'Bodega del Valle',
        ciudad: 'Bogotá',
        tipo_uva: ['Chardonnay'],
        created_at: '2026-06-02T00:00:00Z',
        updated_at: '2026-06-02T00:00:00Z',
    },
];

describe('WineProducerList', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.useRealTimers();
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
                <WineProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Productores de Vino' })).toBeInTheDocument();
        });

        expect(screen.getByText('Viñedo Real')).toBeInTheDocument();
        expect(screen.getByText('Bodega del Valle')).toBeInTheDocument();
        expect(screen.getByText('Cabernet Sauvignon, Merlot')).toBeInTheDocument();
        expect(screen.getByText('Chardonnay')).toBeInTheDocument();
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
                <WineProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('No hay productores de vino registrados.')).toBeInTheDocument();
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
                <WineProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Error al cargar los productores de vino');
        });
    });

    it('renders an edit link for each wine producer', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockProducers), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <WineProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Viñedo Real')).toBeInTheDocument();
        });

        const editLinks = screen.getAllByRole('link', { name: 'Editar' });
        expect(editLinks).toHaveLength(2);
        expect(editLinks[0]).toHaveAttribute('href', '/wine-producers/producer-1/edit');
        expect(editLinks[1]).toHaveAttribute('href', '/wine-producers/producer-2/edit');
    });

    it('removes a producer after confirming deletion in the modal', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockProducers), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
            .mockResolvedValueOnce(new Response(null, { status: 204 }));

        render(
            <MemoryRouter>
                <WineProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Viñedo Real')).toBeInTheDocument();
        });

        await user.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/¿Estás seguro de eliminar/)).toBeInTheDocument();

        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));

        await waitFor(() => {
            expect(screen.getByText('Eliminado correctamente')).toBeInTheDocument();
        });

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        await waitFor(() => {
            expect(screen.queryByText('Viñedo Real')).not.toBeInTheDocument();
        });

        expect(screen.getByText('Bodega del Valle')).toBeInTheDocument();
    });

    it('shows an explicit error in the modal when deletion is rejected', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockProducers), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ detail: 'No tiene permiso para eliminar' }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' },
                })
            );

        render(
            <MemoryRouter>
                <WineProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Viñedo Real')).toBeInTheDocument();
        });

        await user.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('No tiene permiso para eliminar');
        });

        expect(screen.getByText('Viñedo Real')).toBeInTheDocument();
    });
});

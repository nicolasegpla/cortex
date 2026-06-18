import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';

import { WineProducerList } from './index';

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: vi.fn(),
    };
});

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
    });

    it('renders exactly three summary columns', async () => {
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

        const headers = screen.getAllByRole('columnheader');
        expect(headers).toHaveLength(3);
        expect(headers[0]).toHaveTextContent('Nombre Comercial');
        expect(headers[1]).toHaveTextContent('Razón Social');
        expect(headers[2]).toHaveTextContent('Ciudad');
    });

    it('opens the detail modal when the table row is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

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

        const rows = screen.getAllByRole('row');
        const dataRow = rows.find((row) => row.textContent?.includes('Viñedo Real'));
        expect(dataRow).toBeDefined();

        await user.click(dataRow!);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Carlos López')).toBeInTheDocument();
        expect(screen.getByText('Cabernet Sauvignon, Merlot')).toBeInTheDocument();
    });

    it('opens the detail modal when the row action button is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

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

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Viñedo Real' }));

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Carlos López')).toBeInTheDocument();
        expect(screen.getByText('Cabernet Sauvignon, Merlot')).toBeInTheDocument();
    });

    it('opens the detail modal when the row action button is activated with Enter or Space', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

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

        const button = screen.getByRole('button', { name: 'Ver detalles de Viñedo Real' });

        button.focus();
        await user.keyboard('{Enter}');

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Carlos López')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Close details' }));

        button.focus();
        await user.keyboard(' ');

        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('renders fallback placeholders in the detail modal for a sparse record', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

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
            expect(screen.getByText('Bodega del Valle')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Bodega del Valle' }));

        const modal = screen.getByRole('dialog');
        expect(modal).toBeInTheDocument();

        const razonSocialField = within(modal).getByText('Razón Social').closest('div');
        expect(razonSocialField).toHaveTextContent('Razón Social');
        expect(razonSocialField).toHaveTextContent('-');

        const tipoUvaField = within(modal).getByText('Tipo de Uva').closest('div');
        expect(tipoUvaField).toHaveTextContent('Tipo de Uva');
        expect(tipoUvaField).toHaveTextContent('Chardonnay');

        const ciudadField = within(modal).getByText('Ciudad').closest('div');
        expect(ciudadField).toHaveTextContent('Ciudad');
        expect(ciudadField).toHaveTextContent('Bogotá');
    });

    it('dismisses the detail modal with the close button, Escape, and backdrop click', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

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

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Viñedo Real' }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Close details' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Viñedo Real' }));
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Viñedo Real' }));
        await user.click(screen.getByRole('dialog'));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes the detail modal and opens the delete confirmation modal when Delete is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

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

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Viñedo Real' }));
        expect(screen.getByRole('heading', { name: 'Viñedo Real' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Delete' }));

        expect(screen.queryByRole('heading', { name: 'Viñedo Real' })).not.toBeInTheDocument();
        expect(screen.getByText(/¿Estás seguro de eliminar/)).toBeInTheDocument();
    });

    it('navigates to the edit page when the modal Edit button is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        const navigate = vi.fn();
        vi.mocked(useNavigate).mockReturnValue(navigate);

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

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Viñedo Real' }));
        await user.click(screen.getByRole('button', { name: 'Edit' }));

        expect(navigate).toHaveBeenCalledTimes(1);
        expect(navigate).toHaveBeenCalledWith('/wine-producers/producer-1/edit');
    });

    it('opens the delete confirmation modal when the modal Delete button is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

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

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Viñedo Real' }));
        await user.click(screen.getByRole('button', { name: 'Delete' }));

        expect(screen.getByText(/¿Estás seguro de eliminar/)).toBeInTheDocument();
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

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Viñedo Real' }));
        await user.click(screen.getByRole('button', { name: 'Delete' }));

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

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Viñedo Real' }));
        await user.click(screen.getByRole('button', { name: 'Delete' }));
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('No tiene permiso para eliminar');
        });

        expect(screen.getByText('Viñedo Real')).toBeInTheDocument();
    });
});

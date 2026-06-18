import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';

import { BreweryList } from './index';

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: vi.fn(),
    };
});

const mockBreweries = [
    {
        id: 'brewery-1',
        nombre_cerveceria: 'Cervecería Artesanal',
        razon_social: 'Cervecería Artesanal S.A.S.',
        nit: '900123456',
        direccion: 'Calle 123',
        ciudad: 'Medellín',
        pais: 'Colombia',
        nombre_contacto: 'Juan Pérez',
        nombre_cervecero: 'María López',
        celular_1: '3001112222',
        celular_2: '3003334444',
        correo: 'juan@cerveceria.com',
        maltas_utilizadas: ['Pilsner', 'Munich'],
        lupulos_utilizados: ['Cascade', 'Citra'],
        levaduras_utilizadas: ['US-05'],
        utiliza_otros_productos: true,
        estilos_cerveza: ['IPA', 'Stout'],
        tipo_operacion: 'planta_propia',
        marca_equipo: 'BrewTech',
        capacidad_brewhouse: '500L',
        capacidad_fermentacion: '2000L',
        litros_mes: 1000,
        calidad_equipo: 'Alta',
        formatos_venta: ['Lata', 'Botella'],
        donde_vende: 'Bogotá',
        observaciones: 'Buena calidad',
        oportunidades: null,
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
    },
    {
        id: 'brewery-2',
        nombre_cerveceria: 'Brew House',
        ciudad: 'Bogotá',
        maltas_utilizadas: ['Pale Ale'],
        created_at: '2026-06-02T00:00:00Z',
        updated_at: '2026-06-02T00:00:00Z',
    },
];

describe('BreweryList', () => {
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

    it('renders a table with loaded breweries', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockBreweries), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <BreweryList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Cervecerías' })).toBeInTheDocument();
        });

        expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        expect(screen.getByText('Brew House')).toBeInTheDocument();
    });

    it('renders exactly three summary columns', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockBreweries), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <BreweryList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        const headers = screen.getAllByRole('columnheader');
        expect(headers).toHaveLength(3);
        expect(headers[0]).toHaveTextContent('Nombre');
        expect(headers[1]).toHaveTextContent('Razón Social');
        expect(headers[2]).toHaveTextContent('Ciudad');
    });

    it('opens the detail modal when the table row is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockBreweries), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <BreweryList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        const rows = screen.getAllByRole('row');
        const dataRow = rows.find((row) => row.textContent?.includes('Cervecería Artesanal'));
        expect(dataRow).toBeDefined();

        await user.click(dataRow!);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
        expect(screen.getByText('Pilsner, Munich')).toBeInTheDocument();
    });

    it('opens the detail modal when the row action button is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockBreweries), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <BreweryList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Cervecería Artesanal' }));

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
        expect(screen.getByText('Pilsner, Munich')).toBeInTheDocument();
    });

    it('opens the detail modal when the row action button is activated with Enter or Space', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockBreweries), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <BreweryList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        const button = screen.getByRole('button', { name: 'Ver detalles de Cervecería Artesanal' });

        button.focus();
        await user.keyboard('{Enter}');

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Close details' }));

        button.focus();
        await user.keyboard(' ');

        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('dismisses the detail modal with the close button, Escape, and backdrop click', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockBreweries), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <BreweryList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Cervecería Artesanal' }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Close details' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Cervecería Artesanal' }));
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Cervecería Artesanal' }));
        await user.click(screen.getByRole('dialog'));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes the detail modal and opens the delete confirmation modal when Delete is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockBreweries), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <BreweryList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Cervecería Artesanal' }));
        expect(screen.getByRole('heading', { name: 'Cervecería Artesanal' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Delete' }));

        expect(screen.queryByRole('heading', { name: 'Cervecería Artesanal' })).not.toBeInTheDocument();
        expect(screen.getByText(/¿Estás seguro de eliminar/)).toBeInTheDocument();
    });

    it('navigates to the edit page when the modal Edit button is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        const navigate = vi.fn();
        vi.mocked(useNavigate).mockReturnValue(navigate);

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockBreweries), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <BreweryList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Cervecería Artesanal' }));
        await user.click(screen.getByRole('button', { name: 'Edit' }));

        expect(navigate).toHaveBeenCalledTimes(1);
        expect(navigate).toHaveBeenCalledWith('/breweries/brewery-1/edit');
    });

    it('opens the delete confirmation modal when the modal Delete button is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockBreweries), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <BreweryList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Cervecería Artesanal' }));
        await user.click(screen.getByRole('button', { name: 'Delete' }));

        expect(screen.getByText(/¿Estás seguro de eliminar/)).toBeInTheDocument();
    });

    it('shows an empty state when no breweries are returned', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify([]), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <BreweryList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('No hay cervecerías registradas.')).toBeInTheDocument();
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
                <BreweryList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Error al cargar las cervecerías');
        });
    });

    it('removes a brewery after confirming deletion in the modal', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockBreweries), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
            .mockResolvedValueOnce(new Response(null, { status: 204 }));

        render(
            <MemoryRouter>
                <BreweryList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Cervecería Artesanal' }));
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
            expect(screen.queryByText('Cervecería Artesanal')).not.toBeInTheDocument();
        });

        expect(screen.getByText('Brew House')).toBeInTheDocument();
    });

    it('shows an explicit error in the modal when deletion is rejected', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockBreweries), {
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
                <BreweryList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Cervecería Artesanal' }));
        await user.click(screen.getByRole('button', { name: 'Delete' }));
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('No tiene permiso para eliminar');
        });

        expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
    });
});

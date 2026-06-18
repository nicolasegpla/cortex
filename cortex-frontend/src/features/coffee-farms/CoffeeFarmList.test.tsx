import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';

import { CoffeeFarmList } from './index';

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: vi.fn(),
    };
});

const mockFarms = [
    {
        id: 'farm-1',
        nombre_finca: 'Finca Primavera',
        razon_social: 'Primavera S.A.',
        nit: '900123',
        marca: 'Café Primavera',
        direccion: 'Vereda Alto',
        departamento: 'Huila',
        ciudad: 'Pitalito',
        pais: 'Colombia',
        nombre_contacto: 'Juan Pérez',
        celular: '3001234567',
        correo: 'juan@primavera.com',
        tipo_actividad: 'Productor',
        hectareas_totales: '12.50',
        hectareas_cafe: '8.00',
        numero_arboles: 2500,
        variedades_sembradas: ['Castillo', 'Caturra'],
        tipo_proceso: 'Lavado',
        puntaje_cafe: '86.5',
        nivel_tecnificacion: 'Manual',
        equipos: ['Secadero', 'Despulpadora'],
        observaciones: null,
        oportunidades: null,
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
    },
    {
        id: 'farm-2',
        nombre_finca: 'Finca Aurora',
        ciudad: 'Popayán',
        variedades_sembradas: ['Geisha'],
        created_at: '2026-06-02T00:00:00Z',
        updated_at: '2026-06-02T00:00:00Z',
    },
];

describe('CoffeeFarmList', () => {
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

    it('renders a table with loaded coffee farms', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <CoffeeFarmList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Fincas de café' })).toBeInTheDocument();
        });

        expect(screen.getByText('Finca Primavera')).toBeInTheDocument();
        expect(screen.getByText('Finca Aurora')).toBeInTheDocument();
    });

    it('renders exactly three summary columns', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <CoffeeFarmList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Finca Primavera')).toBeInTheDocument();
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
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <CoffeeFarmList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Finca Primavera')).toBeInTheDocument();
        });

        const rows = screen.getAllByRole('row');
        const dataRow = rows.find((row) => row.textContent?.includes('Finca Primavera'));
        expect(dataRow).toBeDefined();

        await user.click(dataRow!);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
        expect(screen.getByText('Castillo, Caturra')).toBeInTheDocument();
    });

    it('opens the detail modal when the row action button is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <CoffeeFarmList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Finca Primavera')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' }));

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
        expect(screen.getByText('Castillo, Caturra')).toBeInTheDocument();
    });

    it('opens the detail modal when the row action button is activated with Enter or Space', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <CoffeeFarmList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Finca Primavera')).toBeInTheDocument();
        });

        const button = screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' });

        button.focus();
        await user.keyboard('{Enter}');

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Cerrar detalles' }));

        button.focus();
        await user.keyboard(' ');

        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('dismisses the detail modal with the close button, Escape, and backdrop click', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <CoffeeFarmList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Finca Primavera')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Cerrar detalles' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' }));
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' }));
        await user.click(screen.getByRole('dialog'));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes the detail modal and opens the delete confirmation modal when Delete is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <CoffeeFarmList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Finca Primavera')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' }));
        expect(screen.getByRole('heading', { name: 'Finca Primavera' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Eliminar' }));

        expect(screen.queryByRole('heading', { name: 'Finca Primavera' })).not.toBeInTheDocument();
        expect(screen.getByText(/¿Estás seguro de eliminar/)).toBeInTheDocument();
    });

    it('navigates to the edit page when the modal Edit button is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        const navigate = vi.fn();
        vi.mocked(useNavigate).mockReturnValue(navigate);

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <CoffeeFarmList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Finca Primavera')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' }));
        await user.click(screen.getByRole('button', { name: 'Editar' }));

        expect(navigate).toHaveBeenCalledTimes(1);
        expect(navigate).toHaveBeenCalledWith('/coffee-farms/farm-1/edit');
    });

    it('opens the delete confirmation modal when the modal Delete button is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <CoffeeFarmList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Finca Primavera')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' }));
        await user.click(screen.getByRole('button', { name: 'Eliminar' }));

        expect(screen.getByText(/¿Estás seguro de eliminar/)).toBeInTheDocument();
    });

    it('shows an empty state when no coffee farms are returned', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify([]), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <CoffeeFarmList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('No hay fincas de café registradas.')).toBeInTheDocument();
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
                <CoffeeFarmList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Error al cargar las fincas de café');
        });
    });

    it('removes a coffee farm after confirming deletion in the modal', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockFarms), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
            .mockResolvedValueOnce(new Response(null, { status: 204 }));

        render(
            <MemoryRouter>
                <CoffeeFarmList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Finca Primavera')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' }));
        await user.click(screen.getByRole('button', { name: 'Eliminar' }));

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
            expect(screen.queryByText('Finca Primavera')).not.toBeInTheDocument();
        });

        expect(screen.getByText('Finca Aurora')).toBeInTheDocument();
    });

    it('keeps the deleted row removed when the success state is dismissed early', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockFarms), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
            .mockResolvedValueOnce(new Response(null, { status: 204 }));

        render(
            <MemoryRouter>
                <CoffeeFarmList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Finca Primavera')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' }));
        await user.click(screen.getByRole('button', { name: 'Eliminar' }));
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));

        await waitFor(() => {
            expect(screen.getByText('Eliminado correctamente')).toBeInTheDocument();
        });

        await user.keyboard('{Escape}');

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        expect(screen.queryByText('Finca Primavera')).not.toBeInTheDocument();
        expect(screen.getByText('Finca Aurora')).toBeInTheDocument();
    });

    it('shows an explicit error in the modal when deletion is rejected', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockFarms), {
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
                <CoffeeFarmList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Finca Primavera')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' }));
        await user.click(screen.getByRole('button', { name: 'Eliminar' }));
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('No tiene permiso para eliminar');
        });

        expect(screen.getByText('Finca Primavera')).toBeInTheDocument();
    });
});

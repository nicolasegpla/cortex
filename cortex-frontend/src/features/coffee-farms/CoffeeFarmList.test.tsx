import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { CoffeeFarmList } from './CoffeeFarmList';

const mockFarms = [
    {
        id: 'farm-1',
        nombre_finca: 'Finca Primavera',
        razon_social: 'Primavera S.A.',
        nit: '900123',
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
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
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
        expect(screen.getByText('Castillo, Caturra')).toBeInTheDocument();
        expect(screen.getByText('Geisha')).toBeInTheDocument();
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

    it('removes a coffee farm after confirming deletion', async () => {
        const user = userEvent.setup();
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockFarms), {
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
                <CoffeeFarmList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Finca Primavera')).toBeInTheDocument();
        });

        const deleteButton = screen.getAllByRole('button', { name: 'Eliminar' })[0];
        await user.click(deleteButton);

        await waitFor(() => {
            expect(screen.queryByText('Finca Primavera')).not.toBeInTheDocument();
        });

        expect(screen.getByText('Finca Aurora')).toBeInTheDocument();
    });
});

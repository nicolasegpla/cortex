import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { BreweryList } from './index';

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

    it('renders an edit link for each brewery', async () => {
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

        const editLinks = screen.getAllByRole('link', { name: 'Editar' });
        expect(editLinks).toHaveLength(2);
        expect(editLinks[0]).toHaveAttribute('href', '/breweries/brewery-1/edit');
        expect(editLinks[1]).toHaveAttribute('href', '/breweries/brewery-2/edit');
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
            expect(screen.queryByText('Cervecería Artesanal')).not.toBeInTheDocument();
        });

        expect(screen.getByText('Brew House')).toBeInTheDocument();
    });

    it('does not delete the brewery when the modal is cancelled before confirming', async () => {
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

        await user.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);

        expect(screen.getByRole('dialog')).toBeInTheDocument();

        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
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

        await user.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('No tiene permiso para eliminar');
        });

        expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
    });
});
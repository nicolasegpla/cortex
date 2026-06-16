import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { BreweryEdit } from './BreweryEdit';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

const mockBrewery = {
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
};

describe('BreweryEdit', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
        mockNavigate.mockClear();
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.clearAllMocks();
        cleanup();
    });

    it('prefills the form with fetched data and formats arrays', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockBrewery), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter initialEntries={['/breweries/brewery-1/edit']}>
                <Routes>
                    <Route path="/breweries/:id/edit" element={<BreweryEdit />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Editar Cervecería' })).toBeInTheDocument();
        });

        expect(screen.getByLabelText(/Nombre de la Cervecería/i)).toHaveValue('Cervecería Artesanal');
        expect(screen.getByLabelText(/Malta que Utiliza/i)).toHaveValue('Pilsner, Munich');
        expect(screen.getByLabelText(/Lúpulos que Utiliza/i)).toHaveValue('Cascade, Citra');
        expect(screen.getByLabelText(/Litros que Hace al Mes/i)).toHaveValue(1000);
    });

    it('submits a PUT payload with arrays parsed and redirects on success', async () => {
        const user = userEvent.setup();
        const fetchSpy = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockBrewery), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ id: 'brewery-1' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            );
        globalThis.fetch = fetchSpy;

        render(
            <MemoryRouter initialEntries={['/breweries/brewery-1/edit']}>
                <Routes>
                    <Route path="/breweries/:id/edit" element={<BreweryEdit />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByLabelText(/Nombre de la Cervecería/i)).toHaveValue('Cervecería Artesanal');
        });

        await user.clear(screen.getByLabelText(/Malta que Utiliza/i));
        await user.type(screen.getByLabelText(/Malta que Utiliza/i), 'Pale Ale, Caramelo');

        await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

        await waitFor(() => {
            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });

        const [putUrl, putConfig] = fetchSpy.mock.calls[1];
        expect(putUrl).toContain('/breweries/brewery-1');
        expect(putConfig.method).toBe('PUT');

        const putBody = JSON.parse(putConfig.body);
        expect(putBody.maltas_utilizadas).toEqual(['Pale Ale', 'Caramelo']);
        expect(putBody.lupulos_utilizados).toEqual(['Cascade', 'Citra']);
        expect(putBody.litros_mes).toBe(1000);
        expect(putBody.utiliza_otros_productos).toBe(true);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/breweries');
        });
    });

    it('shows a not-found state when the brewery cannot be loaded', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ detail: 'Not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter initialEntries={['/breweries/missing/edit']}>
                <Routes>
                    <Route path="/breweries/:id/edit" element={<BreweryEdit />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Registro no encontrado' })).toBeInTheDocument();
        });

        expect(screen.getByRole('link', { name: /Volver a cervecerías/i })).toHaveAttribute(
            'href',
            '/breweries'
        );
    });

    it('shows an error message and keeps form values when the update fails', async () => {
        const user = userEvent.setup();
        const fetchSpy = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockBrewery), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ detail: 'Internal server error' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                })
            );
        globalThis.fetch = fetchSpy;

        render(
            <MemoryRouter initialEntries={['/breweries/brewery-1/edit']}>
                <Routes>
                    <Route path="/breweries/:id/edit" element={<BreweryEdit />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByLabelText(/Nombre de la Cervecería/i)).toHaveValue('Cervecería Artesanal');
        });

        await user.clear(screen.getByLabelText(/Nombre de la Cervecería/i));
        await user.type(screen.getByLabelText(/Nombre de la Cervecería/i), 'Cervecería Renovada');
        await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Error al guardar los cambios');
        });

        expect(screen.getByLabelText(/Nombre de la Cervecería/i)).toHaveValue('Cervecería Renovada');
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
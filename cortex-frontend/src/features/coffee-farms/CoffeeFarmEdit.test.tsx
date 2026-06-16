import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { CoffeeFarmEdit } from './CoffeeFarmEdit';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

const mockFarm = {
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
    observaciones: 'Buena cosecha',
    oportunidades: null,
};

describe('CoffeeFarmEdit', () => {
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

    it('prefills the form with fetched data and formats arrays and numbers', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarm), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter initialEntries={['/coffee-farms/farm-1/edit']}>
                <Routes>
                    <Route path="/coffee-farms/:id/edit" element={<CoffeeFarmEdit />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Editar Finca de Café' })).toBeInTheDocument();
        });

        expect(screen.getByLabelText(/Nombre de la Finca/i)).toHaveValue('Finca Primavera');
        expect(screen.getByLabelText(/Marca/i)).toHaveValue('Café Primavera');
        expect(screen.getByLabelText(/Variedades Sembradas/i)).toHaveValue('Castillo, Caturra');
        expect(screen.getByLabelText(/Equipos/i)).toHaveValue('Secadero, Despulpadora');
        expect(screen.getByLabelText(/Número de Árboles/i)).toHaveValue(2500);
        expect(screen.getByLabelText(/Hectáreas Totales/i)).toHaveValue('12.50');
    });

    it('submits a PUT payload with arrays parsed and redirects on success', async () => {
        const user = userEvent.setup();
        const fetchSpy = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockFarm), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ id: 'farm-1' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            );
        globalThis.fetch = fetchSpy;

        render(
            <MemoryRouter initialEntries={['/coffee-farms/farm-1/edit']}>
                <Routes>
                    <Route path="/coffee-farms/:id/edit" element={<CoffeeFarmEdit />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByLabelText(/Nombre de la Finca/i)).toHaveValue('Finca Primavera');
        });

        await user.clear(screen.getByLabelText(/Variedades Sembradas/i));
        await user.type(screen.getByLabelText(/Variedades Sembradas/i), 'Geisha, Pacamara');

        await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

        await waitFor(() => {
            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });

        const [putUrl, putConfig] = fetchSpy.mock.calls[1];
        expect(putUrl).toContain('/coffee-farms/farm-1');
        expect(putConfig.method).toBe('PUT');

        const putBody = JSON.parse(putConfig.body);
        expect(putBody.variedades_sembradas).toEqual(['Geisha', 'Pacamara']);
        expect(putBody.equipos).toEqual(['Secadero', 'Despulpadora']);
        expect(putBody.numero_arboles).toBe(2500);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/coffee-farms');
        });
    });

    it('shows a not-found state when the farm cannot be loaded', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ detail: 'Not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter initialEntries={['/coffee-farms/missing/edit']}>
                <Routes>
                    <Route path="/coffee-farms/:id/edit" element={<CoffeeFarmEdit />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Registro no encontrado' })).toBeInTheDocument();
        });

        expect(screen.getByRole('link', { name: /Volver a fincas de café/i })).toHaveAttribute(
            'href',
            '/coffee-farms'
        );
    });

    it('shows an error message and keeps form values when the update fails', async () => {
        const user = userEvent.setup();
        const fetchSpy = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockFarm), {
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
            <MemoryRouter initialEntries={['/coffee-farms/farm-1/edit']}>
                <Routes>
                    <Route path="/coffee-farms/:id/edit" element={<CoffeeFarmEdit />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByLabelText(/Nombre de la Finca/i)).toHaveValue('Finca Primavera');
        });

        await user.clear(screen.getByLabelText(/Nombre de la Finca/i));
        await user.type(screen.getByLabelText(/Nombre de la Finca/i), 'Finca Renovada');
        await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Error al guardar los cambios');
        });

        expect(screen.getByLabelText(/Nombre de la Finca/i)).toHaveValue('Finca Renovada');
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});

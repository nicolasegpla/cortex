import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { WineProducerEdit } from './WineProducerEdit';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

const mockProducer = {
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
    observaciones: 'Buena cosecha',
    oportunidades: null,
};

describe('WineProducerEdit', () => {
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
            new Response(JSON.stringify(mockProducer), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter initialEntries={['/wine-producers/producer-1/edit']}>
                <Routes>
                    <Route path="/wine-producers/:id/edit" element={<WineProducerEdit />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Editar Productor de Vino' })).toBeInTheDocument();
        });

        expect(screen.getByLabelText(/Nombre Comercial/i)).toHaveValue('Viñedo Real');
        expect(screen.getByLabelText(/Tipo de Uva/i)).toHaveValue('Cabernet Sauvignon, Merlot');
        expect(screen.getByLabelText(/Levaduras Utilizadas/i)).toHaveValue('Levadura 1');
        expect(screen.getByLabelText(/Marcas/i)).toHaveValue('Real, Reserva');
        expect(screen.getByLabelText(/Producción Anual/i)).toHaveValue('10000 litros');
    });

    it('submits a PUT payload with arrays parsed and redirects on success', async () => {
        const user = userEvent.setup();
        const fetchSpy = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockProducer), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ id: 'producer-1' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            );
        globalThis.fetch = fetchSpy;

        render(
            <MemoryRouter initialEntries={['/wine-producers/producer-1/edit']}>
                <Routes>
                    <Route path="/wine-producers/:id/edit" element={<WineProducerEdit />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByLabelText(/Nombre Comercial/i)).toHaveValue('Viñedo Real');
        });

        await user.clear(screen.getByLabelText(/Tipo de Uva/i));
        await user.type(screen.getByLabelText(/Tipo de Uva/i), 'Chardonnay, Sauvignon Blanc');

        await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

        await waitFor(() => {
            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });

        const [putUrl, putConfig] = fetchSpy.mock.calls[1];
        expect(putUrl).toContain('/wine-producers/producer-1');
        expect(putConfig.method).toBe('PUT');

        const putBody = JSON.parse(putConfig.body);
        expect(putBody.tipo_uva).toEqual(['Chardonnay', 'Sauvignon Blanc']);
        expect(putBody.marcas).toEqual(['Real', 'Reserva']);
        expect(putBody.produccion_anual).toBe('10000 litros');

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/wine-producers');
        });
    });

    it('shows a not-found state when the producer cannot be loaded', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ detail: 'Not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter initialEntries={['/wine-producers/missing/edit']}>
                <Routes>
                    <Route path="/wine-producers/:id/edit" element={<WineProducerEdit />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Registro no encontrado' })).toBeInTheDocument();
        });

        expect(screen.getByRole('link', { name: /Volver a productores de vino/i })).toHaveAttribute(
            'href',
            '/wine-producers'
        );
    });

    it('shows an error message and keeps form values when the update fails', async () => {
        const user = userEvent.setup();
        const fetchSpy = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockProducer), {
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
            <MemoryRouter initialEntries={['/wine-producers/producer-1/edit']}>
                <Routes>
                    <Route path="/wine-producers/:id/edit" element={<WineProducerEdit />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByLabelText(/Nombre Comercial/i)).toHaveValue('Viñedo Real');
        });

        await user.clear(screen.getByLabelText(/Nombre Comercial/i));
        await user.type(screen.getByLabelText(/Nombre Comercial/i), 'Viñedo Renovado');
        await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Error al guardar los cambios');
        });

        expect(screen.getByLabelText(/Nombre Comercial/i)).toHaveValue('Viñedo Renovado');
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});

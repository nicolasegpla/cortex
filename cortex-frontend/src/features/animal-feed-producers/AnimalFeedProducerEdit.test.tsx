import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AnimalFeedProducerEdit } from './AnimalFeedProducerEdit';

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
    observaciones: 'Buena calidad',
    oportunidades: null,
};

describe('AnimalFeedProducerEdit', () => {
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
            <MemoryRouter initialEntries={['/animal-feed-producers/producer-1/edit']}>
                <Routes>
                    <Route path="/animal-feed-producers/:id/edit" element={<AnimalFeedProducerEdit />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Editar Productor de Alimentos para Animales' })).toBeInTheDocument();
        });

        expect(screen.getByLabelText(/Razón Social/i)).toHaveValue('Nutrición Animal S.A.');
        expect(screen.getByLabelText(/Especies Manejadas/i)).toHaveValue('Bovinos, Porcinos');
        expect(screen.getByLabelText(/Productos Fabricados/i)).toHaveValue('Concentrado, Premezcla');
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
            <MemoryRouter initialEntries={['/animal-feed-producers/producer-1/edit']}>
                <Routes>
                    <Route path="/animal-feed-producers/:id/edit" element={<AnimalFeedProducerEdit />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByLabelText(/Razón Social/i)).toHaveValue('Nutrición Animal S.A.');
        });

        await user.clear(screen.getByLabelText(/Especies Manejadas/i));
        await user.type(screen.getByLabelText(/Especies Manejadas/i), 'Bovinos, Equinos');

        await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

        await waitFor(() => {
            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });

        const [putUrl, putConfig] = fetchSpy.mock.calls[1];
        expect(putUrl).toContain('/animal-feed-producers/producer-1');
        expect(putConfig.method).toBe('PUT');

        const putBody = JSON.parse(putConfig.body);
        expect(putBody.especies_manejadas).toEqual(['Bovinos', 'Equinos']);
        expect(putBody.productos_fabricados).toEqual(['Concentrado', 'Premezcla']);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/animal-feed-producers');
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
            <MemoryRouter initialEntries={['/animal-feed-producers/missing/edit']}>
                <Routes>
                    <Route path="/animal-feed-producers/:id/edit" element={<AnimalFeedProducerEdit />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Registro no encontrado' })).toBeInTheDocument();
        });

        expect(screen.getByRole('link', { name: /Volver a productores/i })).toHaveAttribute(
            'href',
            '/animal-feed-producers'
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
            <MemoryRouter initialEntries={['/animal-feed-producers/producer-1/edit']}>
                <Routes>
                    <Route path="/animal-feed-producers/:id/edit" element={<AnimalFeedProducerEdit />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByLabelText(/Razón Social/i)).toHaveValue('Nutrición Animal S.A.');
        });

        await user.clear(screen.getByLabelText(/Razón Social/i));
        await user.type(screen.getByLabelText(/Razón Social/i), 'Nutrición Animal Renovada');
        await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Error al guardar los cambios');
        });

        expect(screen.getByLabelText(/Razón Social/i)).toHaveValue('Nutrición Animal Renovada');
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnimalFeedProducerCreate } from './index';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('AnimalFeedProducerCreate', () => {
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

    it('renders the create form with required fields', () => {
        render(<AnimalFeedProducerCreate />);

        expect(screen.getByRole('heading', { name: 'Crear Productor de Alimentos para Animales' })).toBeInTheDocument();
        expect(screen.getByLabelText(/Razón Social/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Especies Manejadas/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Productos Fabricados/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Crear Productor' })).toBeInTheDocument();
    });

    it('submits a normalized payload and redirects on success', async () => {
        const user = userEvent.setup();
        const fetchSpy = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ id: 'new-producer-id' }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' },
            })
        );
        globalThis.fetch = fetchSpy;

        render(<AnimalFeedProducerCreate />);

        await user.type(screen.getByLabelText(/Razón Social/i), 'Nutrición Animal S.A.');
        await user.type(screen.getByLabelText(/Ciudad/i), 'Medellín');
        await user.type(screen.getByLabelText(/Especies Manejadas/i), 'Bovinos, Porcinos');
        await user.type(screen.getByLabelText(/Productos Fabricados/i), 'Concentrado, Premezcla');

        await user.click(screen.getByRole('button', { name: 'Crear Productor' }));

        await waitFor(() => {
            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining('/animal-feed-producers'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"razon_social":"Nutrición Animal S.A."'),
                })
            );
        });

        const requestBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
        expect(requestBody.especies_manejadas).toEqual(['Bovinos', 'Porcinos']);
        expect(requestBody.productos_fabricados).toEqual(['Concentrado', 'Premezcla']);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/animal-feed-producers');
        });
    });

    it('shows an error message and stays on the form when creation fails', async () => {
        const user = userEvent.setup();
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ detail: 'Internal server error' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(<AnimalFeedProducerCreate />);

        await user.type(screen.getByLabelText(/Razón Social/i), 'Productor Mala');
        await user.click(screen.getByRole('button', { name: 'Crear Productor' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Error al crear el productor de alimentos para animales');
        });

        expect(mockNavigate).not.toHaveBeenCalled();
    });
});

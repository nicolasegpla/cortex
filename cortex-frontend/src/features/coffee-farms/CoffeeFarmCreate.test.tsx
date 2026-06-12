import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CoffeeFarmCreate } from './CoffeeFarmCreate';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('CoffeeFarmCreate', () => {
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
        render(<CoffeeFarmCreate />);

        expect(screen.getByRole('heading', { name: 'Crear Finca de Café' })).toBeInTheDocument();
        expect(screen.getByLabelText(/Nombre de la Finca/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Variedades Sembradas/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Equipos/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Crear Finca de Café' })).toBeInTheDocument();
    });

    it('submits a normalized payload and redirects on success', async () => {
        const user = userEvent.setup();
        const fetchSpy = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ id: 'new-farm-id' }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' },
            })
        );
        globalThis.fetch = fetchSpy;

        render(<CoffeeFarmCreate />);

        await user.type(screen.getByLabelText(/Nombre de la Finca/i), 'Finca Esperanza');
        await user.type(screen.getByLabelText(/Ciudad/i), 'Pitalito');
        await user.type(screen.getByLabelText(/Variedades Sembradas/i), 'Castillo, Caturra');
        await user.type(screen.getByLabelText(/Equipos/i), 'Secadero, Despulpadora');

        await user.click(screen.getByRole('button', { name: 'Crear Finca de Café' }));

        await waitFor(() => {
            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining('/coffee-farms'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"nombre_finca":"Finca Esperanza"'),
                })
            );
        });

        const requestBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
        expect(requestBody.variedades_sembradas).toEqual(['Castillo', 'Caturra']);
        expect(requestBody.equipos).toEqual(['Secadero', 'Despulpadora']);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/coffee-farms');
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

        render(<CoffeeFarmCreate />);

        await user.type(screen.getByLabelText(/Nombre de la Finca/i), 'Finca Mala');
        await user.click(screen.getByRole('button', { name: 'Crear Finca de Café' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Error al crear la finca de café');
        });

        expect(mockNavigate).not.toHaveBeenCalled();
    });
});

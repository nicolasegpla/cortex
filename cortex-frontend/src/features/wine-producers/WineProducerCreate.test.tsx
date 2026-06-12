import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WineProducerCreate } from './index';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('WineProducerCreate', () => {
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
        render(<WineProducerCreate />);

        expect(screen.getByRole('heading', { name: 'Crear Productor de Vino' })).toBeInTheDocument();
        expect(screen.getByLabelText(/Nombre Comercial/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Tipo de Uva/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Levaduras Utilizadas/i)).toBeInTheDocument();
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

        render(<WineProducerCreate />);

        await user.type(screen.getByLabelText(/Nombre Comercial/i), 'Viñedo Real');
        await user.type(screen.getByLabelText(/Ciudad/i), 'Medellín');
        await user.type(screen.getByLabelText(/Tipo de Uva/i), 'Cabernet Sauvignon, Merlot');
        await user.type(screen.getByLabelText(/Levaduras Utilizadas/i), 'Levadura 1, Levadura 2');
        await user.type(screen.getByLabelText(/Tipo de Vino/i), 'Tinto, Rosado');
        await user.type(screen.getByLabelText(/Marcas/i), 'Real, Reserva');
        await user.type(screen.getByLabelText(/Botellas Utilizadas/i), 'Botella 750ml');
        await user.type(screen.getByLabelText(/Nutrientes Utilizados/i), 'Nutriente A');
        await user.type(screen.getByLabelText(/Conservantes Utilizados/i), 'Conservante B');
        await user.type(screen.getByLabelText(/Clarificantes Utilizados/i), 'Clarificante C');

        await user.click(screen.getByRole('button', { name: 'Crear Productor' }));

        await waitFor(() => {
            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining('/wine-producers'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"nombre_comercial":"Viñedo Real"'),
                })
            );
        });

        const requestBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
        expect(requestBody.tipo_uva).toEqual(['Cabernet Sauvignon', 'Merlot']);
        expect(requestBody.levaduras_utilizadas).toEqual(['Levadura 1', 'Levadura 2']);
        expect(requestBody.tipo_vino).toEqual(['Tinto', 'Rosado']);
        expect(requestBody.marcas).toEqual(['Real', 'Reserva']);
        expect(requestBody.botellas_utilizadas).toEqual(['Botella 750ml']);
        expect(requestBody.nutrientes_utilizados).toEqual(['Nutriente A']);
        expect(requestBody.conservantes_utilizados).toEqual(['Conservante B']);
        expect(requestBody.clarificantes_utilizados).toEqual(['Clarificante C']);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/wine-producers');
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

        render(<WineProducerCreate />);

        await user.type(screen.getByLabelText(/Nombre Comercial/i), 'Productor Mala');
        await user.click(screen.getByRole('button', { name: 'Crear Productor' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Error al crear el productor de vino');
        });

        expect(mockNavigate).not.toHaveBeenCalled();
    });
});

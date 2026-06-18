import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { apiClient } from '@/services/api/client';

import { WineProducerForm } from './WineProducerForm';

vi.mock('@/services/api/client', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
    },
}));

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

const baseProps = {
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
};

describe('WineProducerForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('renders empty create form when no initialData or id is provided', () => {
        render(
            <MemoryRouter>
                <WineProducerForm {...baseProps} />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: 'Crear Productor de Vino' })).toBeInTheDocument();
        expect(screen.getByLabelText(/Nombre Comercial/i)).toHaveValue('');
        expect(screen.getByRole('button', { name: 'Crear Productor' })).toBeInTheDocument();
    });

    it('marks nombre_comercial as required via HTML5 validation', () => {
        render(
            <MemoryRouter>
                <WineProducerForm {...baseProps} />
            </MemoryRouter>
        );

        expect(screen.getByLabelText(/Nombre Comercial/i)).toBeRequired();
    });

    it('renders edit form with initialData without fetching', () => {
        render(
            <MemoryRouter>
                <WineProducerForm {...baseProps} initialData={mockProducer} />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: 'Editar Productor de Vino' })).toBeInTheDocument();
        expect(screen.getByLabelText(/Nombre Comercial/i)).toHaveValue('Viñedo Real');
        expect(screen.getByLabelText(/Tipo de Uva/i)).toHaveValue('Cabernet Sauvignon, Merlot');
        expect(screen.getByLabelText(/Marcas/i)).toHaveValue('Real, Reserva');
        expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('fetches and prefills edit data when id is provided without initialData', async () => {
        vi.mocked(apiClient.get).mockResolvedValueOnce(mockProducer);

        render(
            <MemoryRouter>
                <WineProducerForm {...baseProps} id="producer-1" />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(apiClient.get).toHaveBeenCalledWith('/wine-producers/producer-1');
        });

        await waitFor(() => {
            expect(screen.getByLabelText(/Nombre Comercial/i)).toHaveValue('Viñedo Real');
        });

        expect(screen.getByLabelText(/Tipo de Uva/i)).toHaveValue('Cabernet Sauvignon, Merlot');
    });

    it('calls apiClient.post and onSuccess when creating with valid data', async () => {
        const user = userEvent.setup();
        vi.mocked(apiClient.post).mockResolvedValueOnce({ id: 'producer-new' });

        render(
            <MemoryRouter>
                <WineProducerForm {...baseProps} />
            </MemoryRouter>
        );

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
            expect(apiClient.post).toHaveBeenCalledTimes(1);
        });

        const [endpoint, payload] = vi.mocked(apiClient.post).mock.calls[0];
        expect(endpoint).toBe('/wine-producers');
        expect(payload).toMatchObject({
            nombre_comercial: 'Viñedo Real',
            tipo_uva: ['Cabernet Sauvignon', 'Merlot'],
            levaduras_utilizadas: ['Levadura 1', 'Levadura 2'],
            tipo_vino: ['Tinto', 'Rosado'],
            marcas: ['Real', 'Reserva'],
            botellas_utilizadas: ['Botella 750ml'],
            nutrientes_utilizados: ['Nutriente A'],
            conservantes_utilizados: ['Conservante B'],
            clarificantes_utilizados: ['Clarificante C'],
        });

        await waitFor(() => {
            expect(baseProps.onSuccess).toHaveBeenCalledTimes(1);
        });
    });

    it('notifies onSavingChange while submitting', async () => {
        const user = userEvent.setup();
        const onSavingChange = vi.fn();
        let resolveSubmit: (() => void) | undefined;
        const submitPromise = new Promise<void>((resolve) => {
            resolveSubmit = resolve;
        });
        vi.mocked(apiClient.post).mockImplementationOnce(() => submitPromise as Promise<unknown>);

        render(
            <MemoryRouter>
                <WineProducerForm {...baseProps} onSavingChange={onSavingChange} />
            </MemoryRouter>
        );

        await user.type(screen.getByLabelText(/Nombre Comercial/i), 'Viñedo Real');
        await user.click(screen.getByRole('button', { name: 'Crear Productor' }));

        await waitFor(() => {
            expect(onSavingChange).toHaveBeenCalledWith(true);
        });
        expect(onSavingChange).not.toHaveBeenCalledWith(false);

        resolveSubmit?.();

        await waitFor(() => {
            expect(onSavingChange).toHaveBeenCalledWith(false);
        });
    });

    it('calls apiClient.put and onSuccess when editing with valid data', async () => {
        const user = userEvent.setup();
        vi.mocked(apiClient.put).mockResolvedValueOnce({ id: 'producer-1' });

        render(
            <MemoryRouter>
                <WineProducerForm {...baseProps} id="producer-1" initialData={mockProducer} />
            </MemoryRouter>
        );

        await user.clear(screen.getByLabelText(/Nombre Comercial/i));
        await user.type(screen.getByLabelText(/Nombre Comercial/i), 'Viñedo Renovado');
        await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

        await waitFor(() => {
            expect(apiClient.put).toHaveBeenCalledTimes(1);
        });

        const [endpoint, payload] = vi.mocked(apiClient.put).mock.calls[0];
        expect(endpoint).toBe('/wine-producers/producer-1');
        expect(payload).toMatchObject({
            nombre_comercial: 'Viñedo Renovado',
            tipo_uva: ['Cabernet Sauvignon', 'Merlot'],
            marcas: ['Real', 'Reserva'],
            produccion_anual: '10000 litros',
        });

        await waitFor(() => {
            expect(baseProps.onSuccess).toHaveBeenCalledTimes(1);
        });
    });

    it('calls onCancel when the cancel button is clicked', async () => {
        const user = userEvent.setup();

        render(
            <MemoryRouter>
                <WineProducerForm {...baseProps} />
            </MemoryRouter>
        );

        await user.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(baseProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('shows an error message and keeps form values when submit fails', async () => {
        const user = userEvent.setup();
        vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Server error'));

        render(
            <MemoryRouter>
                <WineProducerForm {...baseProps} />
            </MemoryRouter>
        );

        await user.type(screen.getByLabelText(/Nombre Comercial/i), 'Viñedo Real');
        await user.click(screen.getByRole('button', { name: 'Crear Productor' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Error al crear el productor de vino');
        });

        expect(screen.getByLabelText(/Nombre Comercial/i)).toHaveValue('Viñedo Real');
        expect(baseProps.onSuccess).not.toHaveBeenCalled();
    });

    it('shows a not-found state when edit data cannot be loaded', async () => {
        vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Not found'));

        render(
            <MemoryRouter>
                <WineProducerForm {...baseProps} id="missing-id" />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Registro no encontrado' })).toBeInTheDocument();
        });

        expect(apiClient.get).toHaveBeenCalledWith('/wine-producers/missing-id');
    });
});

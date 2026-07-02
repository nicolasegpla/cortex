import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { apiClient } from '@/services/api/client';

import { AnimalFeedProducerForm } from './AnimalFeedProducerForm';

vi.mock('@/services/api/client', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
    },
}));

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

const baseProps = {
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
};

describe('AnimalFeedProducerForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('renders country and city as dependent selects', () => {
        render(
            <MemoryRouter>
                <AnimalFeedProducerForm {...baseProps} />
            </MemoryRouter>
        );

        expect(screen.getByLabelText(/País/i)).toBeInstanceOf(HTMLSelectElement);
        expect(screen.getByLabelText(/Ciudad/i)).toBeInstanceOf(HTMLSelectElement);
    });

    it('renders empty create form when no initialData or id is provided', () => {
        render(
            <MemoryRouter>
                <AnimalFeedProducerForm {...baseProps} />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: 'Crear Productor de Alimentos para Animales' })).toBeInTheDocument();
        expect(screen.getByLabelText(/Razón Social/i)).toBeRequired();
        expect(screen.getByLabelText(/Razón Social/i)).toHaveValue('');
        expect(screen.getByRole('button', { name: 'Crear Productor' })).toBeInTheDocument();
    });

    it('renders edit form with initialData without fetching', () => {
        render(
            <MemoryRouter>
                <AnimalFeedProducerForm {...baseProps} initialData={mockProducer} />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: 'Editar Productor de Alimentos para Animales' })).toBeInTheDocument();
        expect(screen.getByLabelText(/Razón Social/i)).toHaveValue('Nutrición Animal S.A.');
        expect(screen.getByLabelText(/Especies Manejadas/i)).toHaveValue('Bovinos, Porcinos');
        expect(screen.getByLabelText(/Productos Fabricados/i)).toHaveValue('Concentrado, Premezcla');
        expect(screen.getByLabelText(/País/i)).toHaveValue('Colombia');
        expect(screen.getByLabelText(/Ciudad/i)).toHaveValue('Medellín');
        expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('fetches and prefills edit data when id is provided without initialData', async () => {
        vi.mocked(apiClient.get).mockResolvedValueOnce(mockProducer);

        render(
            <MemoryRouter>
                <AnimalFeedProducerForm {...baseProps} id="producer-1" />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(apiClient.get).toHaveBeenCalledWith('/animal-feed-producers/producer-1');
        });

        await waitFor(() => {
            expect(screen.getByLabelText(/Razón Social/i)).toHaveValue('Nutrición Animal S.A.');
        });

        expect(screen.getByLabelText(/Especies Manejadas/i)).toHaveValue('Bovinos, Porcinos');
    });

    it('calls apiClient.post and onSuccess when creating with valid data', async () => {
        const user = userEvent.setup();
        vi.mocked(apiClient.post).mockResolvedValueOnce({ id: 'producer-new' });

        render(
            <MemoryRouter>
                <AnimalFeedProducerForm {...baseProps} />
            </MemoryRouter>
        );

        await user.type(screen.getByLabelText(/Razón Social/i), 'Nutrición Animal S.A.');
        await user.selectOptions(screen.getByLabelText(/País/i), 'Colombia');
        await user.selectOptions(screen.getByLabelText(/Ciudad/i), 'Medellín');
        await user.type(screen.getByLabelText(/Especies Manejadas/i), 'Bovinos, Porcinos');
        await user.type(screen.getByLabelText(/Productos Fabricados/i), 'Concentrado, Premezcla');

        await user.click(screen.getByRole('button', { name: 'Crear Productor' }));

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledTimes(1);
        });

        const [endpoint, payload] = vi.mocked(apiClient.post).mock.calls[0];
        expect(endpoint).toBe('/animal-feed-producers');
        expect(payload).toMatchObject({
            razon_social: 'Nutrición Animal S.A.',
            pais: 'Colombia',
            ciudad: 'Medellín',
            especies_manejadas: ['Bovinos', 'Porcinos'],
            productos_fabricados: ['Concentrado', 'Premezcla'],
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
                <AnimalFeedProducerForm {...baseProps} onSavingChange={onSavingChange} />
            </MemoryRouter>
        );

        await user.type(screen.getByLabelText(/Razón Social/i), 'Nutrición Animal S.A.');
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
                <AnimalFeedProducerForm {...baseProps} id="producer-1" initialData={mockProducer} />
            </MemoryRouter>
        );

        await user.clear(screen.getByLabelText(/Razón Social/i));
        await user.type(screen.getByLabelText(/Razón Social/i), 'Nutrición Animal Renovada');
        await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

        await waitFor(() => {
            expect(apiClient.put).toHaveBeenCalledTimes(1);
        });

        const [endpoint, payload] = vi.mocked(apiClient.put).mock.calls[0];
        expect(endpoint).toBe('/animal-feed-producers/producer-1');
        expect(payload).toMatchObject({
            razon_social: 'Nutrición Animal Renovada',
            especies_manejadas: ['Bovinos', 'Porcinos'],
            productos_fabricados: ['Concentrado', 'Premezcla'],
        });

        await waitFor(() => {
            expect(baseProps.onSuccess).toHaveBeenCalledTimes(1);
        });
    });

    it('calls onCancel when the cancel button is clicked', async () => {
        const user = userEvent.setup();

        render(
            <MemoryRouter>
                <AnimalFeedProducerForm {...baseProps} />
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
                <AnimalFeedProducerForm {...baseProps} />
            </MemoryRouter>
        );

        await user.type(screen.getByLabelText(/Razón Social/i), 'Nutrición Animal S.A.');
        await user.click(screen.getByRole('button', { name: 'Crear Productor' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Error al crear el productor de alimentos para animales');
        });

        expect(screen.getByLabelText(/Razón Social/i)).toHaveValue('Nutrición Animal S.A.');
        expect(baseProps.onSuccess).not.toHaveBeenCalled();
    });

    it('shows a not-found state when edit data cannot be loaded', async () => {
        vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Not found'));

        render(
            <MemoryRouter>
                <AnimalFeedProducerForm {...baseProps} id="missing-id" />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Registro no encontrado' })).toBeInTheDocument();
        });

        expect(apiClient.get).toHaveBeenCalledWith('/animal-feed-producers/missing-id');
    });

    it('resets to an empty create form when switching from edit mode to create mode', () => {
        const { rerender } = render(
            <MemoryRouter>
                <AnimalFeedProducerForm {...baseProps} initialData={mockProducer} />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: 'Editar Productor de Alimentos para Animales' })).toBeInTheDocument();
        expect(screen.getByLabelText(/Razón Social/i)).toHaveValue('Nutrición Animal S.A.');

        rerender(
            <MemoryRouter>
                <AnimalFeedProducerForm {...baseProps} />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: 'Crear Productor de Alimentos para Animales' })).toBeInTheDocument();
        expect(screen.getByLabelText(/Razón Social/i)).toHaveValue('');
        expect(screen.getByLabelText(/Especies Manejadas/i)).toHaveValue('');
    });

    it('clears the selected city when the country changes', async () => {
        const user = userEvent.setup();

        render(
            <MemoryRouter>
                <AnimalFeedProducerForm {...baseProps} initialData={mockProducer} />
            </MemoryRouter>
        );

        expect(screen.getByLabelText(/Ciudad/i)).toHaveValue('Medellín');

        await user.selectOptions(screen.getByLabelText(/País/i), 'Venezuela');

        expect(screen.getByLabelText(/País/i)).toHaveValue('Venezuela');
        expect(screen.getByLabelText(/Ciudad/i)).toHaveValue('');
        expect(screen.getByRole('option', { name: 'Caracas' })).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: 'Medellín' })).not.toBeInTheDocument();
    });

    it('renders a legacy city as a transient option in edit mode', () => {
        const legacyProducer = { ...mockProducer, ciudad: 'Palmira' };

        render(
            <MemoryRouter>
                <AnimalFeedProducerForm {...baseProps} initialData={legacyProducer} />
            </MemoryRouter>
        );

        expect(screen.getByLabelText(/Ciudad/i)).toHaveValue('Palmira');
        expect(screen.getByRole('option', { name: 'Palmira' })).toBeInTheDocument();
    });
});

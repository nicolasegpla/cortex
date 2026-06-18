import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { apiClient } from '@/services/api/client';

import { CoffeeFarmForm } from './CoffeeFarmForm';

vi.mock('@/services/api/client', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
    },
}));

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

const baseProps = {
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
};

describe('CoffeeFarmForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('renders empty create form when no initialData or id is provided', () => {
        render(
            <MemoryRouter>
                <CoffeeFarmForm {...baseProps} />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: 'Crear Finca de Café' })).toBeInTheDocument();
        expect(screen.getByLabelText(/Nombre de la Finca/i)).toHaveValue('');
        expect(screen.getByRole('button', { name: 'Crear Finca de Café' })).toBeInTheDocument();
    });

    it('renders edit form with initialData without fetching', () => {
        render(
            <MemoryRouter>
                <CoffeeFarmForm {...baseProps} initialData={mockFarm} />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: 'Editar Finca de Café' })).toBeInTheDocument();
        expect(screen.getByLabelText(/Nombre de la Finca/i)).toHaveValue('Finca Primavera');
        expect(screen.getByLabelText(/Variedades Sembradas/i)).toHaveValue('Castillo, Caturra');
        expect(screen.getByLabelText(/Equipos/i)).toHaveValue('Secadero, Despulpadora');
        expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('fetches and prefills edit data when id is provided without initialData', async () => {
        vi.mocked(apiClient.get).mockResolvedValueOnce(mockFarm);

        render(
            <MemoryRouter>
                <CoffeeFarmForm {...baseProps} id="farm-1" />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(apiClient.get).toHaveBeenCalledWith('/coffee-farms/farm-1');
        });

        await waitFor(() => {
            expect(screen.getByLabelText(/Nombre de la Finca/i)).toHaveValue('Finca Primavera');
        });

        expect(screen.getByLabelText(/Variedades Sembradas/i)).toHaveValue('Castillo, Caturra');
    });

    it('calls apiClient.post and onSuccess when creating with valid data', async () => {
        const user = userEvent.setup();
        vi.mocked(apiClient.post).mockResolvedValueOnce({ id: 'farm-new' });

        render(
            <MemoryRouter>
                <CoffeeFarmForm {...baseProps} />
            </MemoryRouter>
        );

        await user.type(screen.getByLabelText(/Nombre de la Finca/i), 'Finca Esperanza');
        await user.type(screen.getByLabelText(/Marca/i), 'Café Primavera');
        await user.type(screen.getByLabelText(/Ciudad/i), 'Pitalito');
        await user.type(screen.getByLabelText(/Variedades Sembradas/i), 'Castillo, Caturra');
        await user.type(screen.getByLabelText(/Equipos/i), 'Secadero, Despulpadora');

        await user.click(screen.getByRole('button', { name: 'Crear Finca de Café' }));

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledTimes(1);
        });

        const [endpoint, payload] = vi.mocked(apiClient.post).mock.calls[0];
        expect(endpoint).toBe('/coffee-farms');
        expect(payload).toMatchObject({
            nombre_finca: 'Finca Esperanza',
            marca: 'Café Primavera',
            variedades_sembradas: ['Castillo', 'Caturra'],
            equipos: ['Secadero', 'Despulpadora'],
        });

        await waitFor(() => {
            expect(baseProps.onSuccess).toHaveBeenCalledTimes(1);
        });
    });

    it('preserves zero values instead of converting them to null', async () => {
        const user = userEvent.setup();
        vi.mocked(apiClient.post).mockResolvedValueOnce({ id: 'farm-zero' });

        render(
            <MemoryRouter>
                <CoffeeFarmForm {...baseProps} />
            </MemoryRouter>
        );

        await user.type(screen.getByLabelText(/Nombre de la Finca/i), 'Finca Cero');
        await user.type(screen.getByLabelText(/Hectáreas Totales/i), '0');
        await user.type(screen.getByLabelText(/Hectáreas de Café/i), '0');
        await user.type(screen.getByLabelText(/Puntaje del Café/i), '0');

        await user.click(screen.getByRole('button', { name: 'Crear Finca de Café' }));

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledTimes(1);
        });

        const [, payload] = vi.mocked(apiClient.post).mock.calls[0];
        expect(payload).toMatchObject({
            hectareas_totales: '0',
            hectareas_cafe: '0',
            puntaje_cafe: '0',
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
                <CoffeeFarmForm {...baseProps} onSavingChange={onSavingChange} />
            </MemoryRouter>
        );

        await user.type(screen.getByLabelText(/Nombre de la Finca/i), 'Finca Esperanza');
        await user.click(screen.getByRole('button', { name: 'Crear Finca de Café' }));

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith('/coffee-farms', expect.any(Object));
            expect(onSavingChange).toHaveBeenCalledWith(true);
        });

        resolveSubmit?.();

        await waitFor(() => {
            expect(onSavingChange).toHaveBeenCalledWith(false);
        });
    });

    it('calls apiClient.put and onSuccess when editing with valid data', async () => {
        const user = userEvent.setup();
        vi.mocked(apiClient.put).mockResolvedValueOnce({ id: 'farm-1' });

        render(
            <MemoryRouter>
                <CoffeeFarmForm {...baseProps} id="farm-1" initialData={mockFarm} />
            </MemoryRouter>
        );

        await user.clear(screen.getByLabelText(/Nombre de la Finca/i));
        await user.type(screen.getByLabelText(/Nombre de la Finca/i), 'Finca Renovada');
        await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

        await waitFor(() => {
            expect(apiClient.put).toHaveBeenCalledTimes(1);
        });

        const [endpoint, payload] = vi.mocked(apiClient.put).mock.calls[0];
        expect(endpoint).toBe('/coffee-farms/farm-1');
        expect(payload).toMatchObject({
            nombre_finca: 'Finca Renovada',
            variedades_sembradas: ['Castillo', 'Caturra'],
            equipos: ['Secadero', 'Despulpadora'],
            numero_arboles: 2500,
        });

        await waitFor(() => {
            expect(baseProps.onSuccess).toHaveBeenCalledTimes(1);
        });
    });

    it('calls onCancel when the cancel button is clicked', async () => {
        const user = userEvent.setup();

        render(
            <MemoryRouter>
                <CoffeeFarmForm {...baseProps} />
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
                <CoffeeFarmForm {...baseProps} />
            </MemoryRouter>
        );

        await user.type(screen.getByLabelText(/Nombre de la Finca/i), 'Finca Esperanza');
        await user.click(screen.getByRole('button', { name: 'Crear Finca de Café' }));

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledTimes(1);
            expect(screen.getByRole('alert')).toHaveTextContent('Error al crear la finca de café');
        });

        expect(screen.getByLabelText(/Nombre de la Finca/i)).toHaveValue('Finca Esperanza');
        expect(baseProps.onSuccess).not.toHaveBeenCalled();
    });

    it('shows a not-found state when edit data cannot be loaded', async () => {
        vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Not found'));

        render(
            <MemoryRouter>
                <CoffeeFarmForm {...baseProps} id="missing-id" />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Registro no encontrado' })).toBeInTheDocument();
        });

        expect(apiClient.get).toHaveBeenCalledWith('/coffee-farms/missing-id');
    });

    it('resets to an empty create form when switching from edit mode to create mode', () => {
        const { rerender } = render(
            <MemoryRouter>
                <CoffeeFarmForm {...baseProps} initialData={mockFarm} />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: 'Editar Finca de Café' })).toBeInTheDocument();
        expect(screen.getByLabelText(/Nombre de la Finca/i)).toHaveValue('Finca Primavera');

        rerender(
            <MemoryRouter>
                <CoffeeFarmForm {...baseProps} />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: 'Crear Finca de Café' })).toBeInTheDocument();
        expect(screen.getByLabelText(/Nombre de la Finca/i)).toHaveValue('');
        expect(screen.getByLabelText(/Variedades Sembradas/i)).toHaveValue('');
    });
});

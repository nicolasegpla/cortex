import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { apiClient } from '@/services/api/client';

import { BreweryForm } from './BreweryForm';

vi.mock('@/services/api/client', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
    },
}));

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

const baseProps = {
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
};

describe('BreweryForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('renders empty create form when no initialData or id is provided', () => {
        render(
            <MemoryRouter>
                <BreweryForm {...baseProps} />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: 'Crear Cervecería' })).toBeInTheDocument();
        expect(screen.getByLabelText(/Nombre de la Cervecería/i)).toHaveValue('');
        expect(screen.getByRole('button', { name: 'Crear Cervecería' })).toBeInTheDocument();
    });

    it('renders edit form with initialData without fetching', () => {
        render(
            <MemoryRouter>
                <BreweryForm {...baseProps} initialData={mockBrewery} />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: 'Editar Cervecería' })).toBeInTheDocument();
        expect(screen.getByLabelText(/Nombre de la Cervecería/i)).toHaveValue('Cervecería Artesanal');
        expect(screen.getByLabelText(/Malta que Utiliza/i)).toHaveValue('Pilsner, Munich');
        expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('fetches and prefills edit data when id is provided without initialData', async () => {
        vi.mocked(apiClient.get).mockResolvedValueOnce(mockBrewery);

        render(
            <MemoryRouter>
                <BreweryForm {...baseProps} id="brewery-1" />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(apiClient.get).toHaveBeenCalledWith('/breweries/brewery-1');
        });

        await waitFor(() => {
            expect(screen.getByLabelText(/Nombre de la Cervecería/i)).toHaveValue('Cervecería Artesanal');
        });

        expect(screen.getByLabelText(/Malta que Utiliza/i)).toHaveValue('Pilsner, Munich');
    });

    it('calls apiClient.post and onSuccess when creating with valid data', async () => {
        const user = userEvent.setup();
        vi.mocked(apiClient.post).mockResolvedValueOnce({ id: 'brewery-new' });

        render(
            <MemoryRouter>
                <BreweryForm {...baseProps} />
            </MemoryRouter>
        );

        await user.type(screen.getByLabelText(/Nombre de la Cervecería/i), 'Nueva Cervecería');
        await user.type(screen.getByLabelText(/Malta que Utiliza/i), 'Pale Ale, Caramelo');
        await user.type(screen.getByLabelText(/Litros que Hace al Mes/i), '500');

        await user.click(screen.getByRole('button', { name: 'Crear Cervecería' }));

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledTimes(1);
        });

        const [endpoint, payload] = vi.mocked(apiClient.post).mock.calls[0];
        expect(endpoint).toBe('/breweries');
        expect(payload).toMatchObject({
            nombre_cerveceria: 'Nueva Cervecería',
            maltas_utilizadas: ['Pale Ale', 'Caramelo'],
            litros_mes: 500,
        });

        await waitFor(() => {
            expect(baseProps.onSuccess).toHaveBeenCalledTimes(1);
        });
    });

    it('calls apiClient.put and onSuccess when editing with valid data', async () => {
        const user = userEvent.setup();
        vi.mocked(apiClient.put).mockResolvedValueOnce({ id: 'brewery-1' });

        render(
            <MemoryRouter>
                <BreweryForm {...baseProps} id="brewery-1" initialData={mockBrewery} />
            </MemoryRouter>
        );

        await user.clear(screen.getByLabelText(/Nombre de la Cervecería/i));
        await user.type(screen.getByLabelText(/Nombre de la Cervecería/i), 'Cervecería Renovada');
        await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

        await waitFor(() => {
            expect(apiClient.put).toHaveBeenCalledTimes(1);
        });

        const [endpoint, payload] = vi.mocked(apiClient.put).mock.calls[0];
        expect(endpoint).toBe('/breweries/brewery-1');
        expect(payload).toMatchObject({
            nombre_cerveceria: 'Cervecería Renovada',
            maltas_utilizadas: ['Pilsner', 'Munich'],
            litros_mes: 1000,
        });

        await waitFor(() => {
            expect(baseProps.onSuccess).toHaveBeenCalledTimes(1);
        });
    });

    it('calls onCancel when the cancel button is clicked', async () => {
        const user = userEvent.setup();

        render(
            <MemoryRouter>
                <BreweryForm {...baseProps} />
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
                <BreweryForm {...baseProps} />
            </MemoryRouter>
        );

        await user.type(screen.getByLabelText(/Nombre de la Cervecería/i), 'Nueva Cervecería');
        await user.click(screen.getByRole('button', { name: 'Crear Cervecería' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Error al guardar la cervecería');
        });

        expect(screen.getByLabelText(/Nombre de la Cervecería/i)).toHaveValue('Nueva Cervecería');
        expect(baseProps.onSuccess).not.toHaveBeenCalled();
    });

    it('shows a not-found state when edit data cannot be loaded', async () => {
        vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Not found'));

        render(
            <MemoryRouter>
                <BreweryForm {...baseProps} id="missing-id" />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Registro no encontrado' })).toBeInTheDocument();
        });

        expect(apiClient.get).toHaveBeenCalledWith('/breweries/missing-id');
    });
});

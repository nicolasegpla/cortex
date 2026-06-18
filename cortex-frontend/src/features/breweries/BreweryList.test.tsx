import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { BreweryList } from './index';

const mockBreweries = [
    {
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
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
    },
    {
        id: 'brewery-2',
        nombre_cerveceria: 'Brew House',
        ciudad: 'Bogotá',
        maltas_utilizadas: ['Pale Ale'],
        created_at: '2026-06-02T00:00:00Z',
        updated_at: '2026-06-02T00:00:00Z',
    },
];

function renderWithRouter(ui: React.ReactElement, { initialEntries = ['/breweries'] } = {}) {
    return render(
        <MemoryRouter initialEntries={initialEntries}>
            {ui}
        </MemoryRouter>
    );
}

describe('BreweryList', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.useRealTimers();
        vi.restoreAllMocks();
        cleanup();
    });

    it('renders a table with loaded breweries', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockBreweries), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<BreweryList />);

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        expect(screen.getByText('Brew House')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Agregar Cervecería' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Crear Cervecería', level: 2 })).not.toBeInTheDocument();
    });

    it('renders exactly three summary columns', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockBreweries), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<BreweryList />);

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        const headers = screen.getAllByRole('columnheader');
        expect(headers).toHaveLength(3);
        expect(headers[0]).toHaveTextContent('Nombre');
        expect(headers[1]).toHaveTextContent('Razón Social');
        expect(headers[2]).toHaveTextContent('Ciudad');
    });

    it('opens the detail modal when the table row is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockBreweries), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<BreweryList />);

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Cervecería Artesanal' }));
        expect(screen.getByRole('heading', { name: 'Cervecería Artesanal' })).toBeInTheDocument();
    });

    it('opens the detail modal when the row action button is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockBreweries), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<BreweryList />);

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Cervecería Artesanal' }));
        expect(screen.getByRole('heading', { name: 'Cervecería Artesanal' })).toBeInTheDocument();
    });

    it('opens the detail modal when the row action button is activated with Enter or Space', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockBreweries), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<BreweryList />);

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        const rowButton = screen.getByRole('button', { name: 'Ver detalles de Cervecería Artesanal' });
        rowButton.focus();
        await user.keyboard('{Enter}');

        expect(screen.getByRole('heading', { name: 'Cervecería Artesanal' })).toBeInTheDocument();
    });

    it('dismisses the detail modal with the close button, Escape, and backdrop click', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockBreweries), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<BreweryList />);

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Cervecería Artesanal' }));
        expect(screen.getByRole('heading', { name: 'Cervecería Artesanal' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Cerrar detalles' }));
        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: 'Cervecería Artesanal' })).not.toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Cervecería Artesanal' }));
        await user.keyboard('{Escape}');
        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: 'Cervecería Artesanal' })).not.toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Cervecería Artesanal' }));
        await user.click(screen.getByRole('dialog'));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes the detail modal and opens the form modal when Edit is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockBreweries), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<BreweryList />);

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Cervecería Artesanal' }));
        expect(screen.getByRole('heading', { name: 'Cervecería Artesanal' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Editar' }));

        expect(screen.queryByRole('heading', { name: 'Cervecería Artesanal' })).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Editar Cervecería', level: 2 })).toBeInTheDocument();
        expect(screen.getByLabelText(/Nombre de la Cervecería/i)).toHaveValue('Cervecería Artesanal');
    });

    it('opens the create form modal when Agregar Cervecería is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockBreweries), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<BreweryList />);

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Agregar Cervecería' }));

        expect(screen.getByRole('heading', { name: 'Crear Cervecería', level: 2 })).toBeInTheDocument();
    });

    it('closes the form modal with the close button and Cancelar button', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockBreweries), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<BreweryList />);

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Agregar Cervecería' }));
        expect(screen.getByRole('heading', { name: 'Crear Cervecería', level: 2 })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Cerrar formulario' }));
        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: 'Crear Cervecería', level: 2 })).not.toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Agregar Cervecería' }));
        await user.click(screen.getByRole('button', { name: 'Cancelar' }));
        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: 'Crear Cervecería', level: 2 })).not.toBeInTheDocument();
        });
    });

    it('opens the delete confirmation modal when the modal Delete button is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockBreweries), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<BreweryList />);

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Cervecería Artesanal' }));
        await user.click(screen.getByRole('button', { name: 'Eliminar' }));

        expect(screen.getByText(/¿Estás seguro de eliminar/)).toBeInTheDocument();
    });

    it('shows a loading row inside the table while data is loading', async () => {
        globalThis.fetch = vi.fn(() => new Promise(() => {}));

        renderWithRouter(<BreweryList />);

        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getAllByRole('columnheader')).toHaveLength(3);
        expect(screen.getByText('Cargando cervecerías...')).toBeInTheDocument();
        expect(screen.queryByText('No hay cervecerías registradas.')).not.toBeInTheDocument();
    });

    it('shows an empty state when no breweries are returned', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify([]), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<BreweryList />);

        await waitFor(() => {
            expect(screen.getByText('No hay cervecerías registradas.')).toBeInTheDocument();
        });
    });

    it('shows an error message when the API request fails', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        renderWithRouter(<BreweryList />);

        await waitFor(() => {
            expect(screen.getByText('Error al cargar las cervecerías')).toBeInTheDocument();
        });
    });

    it('removes a brewery after confirming deletion in the modal', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockBreweries), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
            .mockResolvedValueOnce(
                new Response(null, {
                    status: 204,
                })
            );

        renderWithRouter(<BreweryList />);

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Cervecería Artesanal' }));
        await user.click(screen.getByRole('button', { name: 'Eliminar' }));
        await user.click(screen.getByRole('button', { name: 'Eliminar' }));

        await waitFor(() => {
            expect(screen.queryByText('Cervecería Artesanal')).not.toBeInTheDocument();
        });

        expect(screen.getByText('Brew House')).toBeInTheDocument();
    });

    it('shows an explicit error in the modal when deletion is rejected', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockBreweries), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ detail: 'No tiene permiso para eliminar' }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' },
                })
            );

        renderWithRouter(<BreweryList />);

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Cervecería Artesanal' }));
        await user.click(screen.getByRole('button', { name: 'Eliminar' }));
        await user.click(screen.getByRole('button', { name: 'Eliminar' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('No tiene permiso para eliminar');
        });

        expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
    });

    it('refetches the list after a successful create submit', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockBreweries), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ id: 'brewery-new' }), {
                    status: 201,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify([...mockBreweries, { id: 'brewery-new', nombre_cerveceria: 'Nueva Cervecería', ciudad: 'Cali' }]), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            );

        renderWithRouter(<BreweryList />);

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Agregar Cervecería' }));

        await user.type(screen.getByLabelText(/Nombre de la Cervecería/i), 'Nueva Cervecería');
        await user.click(screen.getByRole('button', { name: 'Crear Cervecería' }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledTimes(3);
        });

        await waitFor(() => {
            expect(screen.getByText('Nueva Cervecería')).toBeInTheDocument();
        });

        expect(screen.queryByRole('heading', { name: 'Crear Cervecería' })).not.toBeInTheDocument();
    });

    it('shows a loading overlay in the form modal while submitting', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        let resolveSubmit: (() => void) | undefined;
        const submitPromise = new Promise<void>((resolve) => {
            resolveSubmit = resolve;
        });

        globalThis.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
            if (init?.method === 'POST') {
                return submitPromise.then(
                    () =>
                        new Response(JSON.stringify({ id: 'brewery-new' }), {
                            status: 201,
                            headers: { 'Content-Type': 'application/json' },
                        })
                );
            }

            return Promise.resolve(
                new Response(JSON.stringify(mockBreweries), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            );
        });

        renderWithRouter(<BreweryList />);

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Agregar Cervecería' }));

        await user.type(screen.getByLabelText(/Nombre de la Cervecería/i), 'Nueva Cervecería');
        await user.click(screen.getByRole('button', { name: 'Crear Cervecería' }));

        await waitFor(() => {
            expect(screen.getByText('Guardando...')).toBeInTheDocument();
            expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true');
        });

        act(() => {
            resolveSubmit?.();
        });

        await waitFor(() => {
            expect(screen.queryByText('Guardando...')).not.toBeInTheDocument();
            expect(screen.queryByRole('heading', { name: 'Crear Cervecería', level: 2 })).not.toBeInTheDocument();
        });
    });

    it('keeps form values when submit fails', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockBreweries), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ detail: 'Server error' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                })
            );

        renderWithRouter(<BreweryList />);

        await waitFor(() => {
            expect(screen.getByText('Cervecería Artesanal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Agregar Cervecería' }));

        await user.type(screen.getByLabelText(/Nombre de la Cervecería/i), 'Nueva Cervecería');
        await user.click(screen.getByRole('button', { name: 'Crear Cervecería' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Error al guardar la cervecería');
        });

        expect(screen.getByLabelText(/Nombre de la Cervecería/i)).toHaveValue('Nueva Cervecería');
    });
});

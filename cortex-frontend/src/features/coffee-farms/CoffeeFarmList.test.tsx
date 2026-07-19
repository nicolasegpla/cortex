import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { CoffeeFarmList } from './index';

const mockFarms = [
    {
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
        phones: ['3107654321', '3001234567'],
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
        observaciones: null,
        oportunidades: null,
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
    },
    {
        id: 'farm-2',
        nombre_finca: 'Finca Aurora',
        ciudad: 'Popayán',
        variedades_sembradas: ['Geisha'],
        created_at: '2026-06-02T00:00:00Z',
        updated_at: '2026-06-02T00:00:00Z',
    },
];

function renderWithRouter(ui: React.ReactElement, { initialEntries = ['/coffee-farms'] } = {}) {
    return render(
        <MemoryRouter initialEntries={initialEntries}>
            {ui}
        </MemoryRouter>
    );
}

describe('CoffeeFarmList', () => {
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

    it('renders a table with loaded coffee farms', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<CoffeeFarmList />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' })).toBeInTheDocument();
        });

        expect(screen.getByRole('button', { name: 'Ver detalles de Finca Aurora' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Agregar Finca de Café' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Crear Finca de Café', level: 2 })).not.toBeInTheDocument();
    });

    it('renders exactly three summary columns', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<CoffeeFarmList />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' })).toBeInTheDocument();
        });

        const headers = screen.getAllByRole('columnheader');
        expect(headers).toHaveLength(3);
        expect(headers[0]).toHaveTextContent('Nombre');
        expect(headers[1]).toHaveTextContent('Razón Social');
        expect(headers[2]).toHaveTextContent('Ciudad');
    });

    it('renders table values in lowercase', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<CoffeeFarmList />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' })).toBeInTheDocument();
        });

        expect(screen.getByRole('button', { name: 'Ver detalles de Finca Aurora' })).toBeInTheDocument();
        expect(screen.getByText('primavera s.a.')).toBeInTheDocument();
        expect(screen.getByText('pitalito')).toBeInTheDocument();
        expect(screen.getByText('popayán')).toBeInTheDocument();
    });

    it('opens the detail modal when the table row is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<CoffeeFarmList />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' })).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' }));
        expect(screen.getByRole('heading', { name: 'Finca Primavera' })).toBeInTheDocument();
    });

    it('opens the detail modal when the row action button is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<CoffeeFarmList />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' })).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' }));
        expect(screen.getByRole('heading', { name: 'Finca Primavera' })).toBeInTheDocument();
    });

    it('opens the detail modal when the row action button is activated with Enter or Space', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<CoffeeFarmList />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' })).toBeInTheDocument();
        });

        const rowButton = screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' });
        rowButton.focus();
        await user.keyboard('{Enter}');

        expect(screen.getByRole('heading', { name: 'Finca Primavera' })).toBeInTheDocument();
    });

    it('dismisses the detail modal with the close button, Escape, and backdrop click', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<CoffeeFarmList />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' })).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' }));
        expect(screen.getByRole('heading', { name: 'Finca Primavera' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Cerrar detalles' }));
        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: 'Finca Primavera' })).not.toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' }));
        await user.keyboard('{Escape}');
        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: 'Finca Primavera' })).not.toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' }));
        await user.click(screen.getByRole('dialog'));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders phones in the contact section of the detail modal', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<CoffeeFarmList />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' })).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' }));
        expect(screen.getByRole('heading', { name: 'Finca Primavera' })).toBeInTheDocument();
        expect(screen.getByText('Teléfonos')).toBeInTheDocument();
        expect(screen.getByText('3107654321, 3001234567')).toBeInTheDocument();
    });

    it('does not render the legacy Celular label in the detail modal', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<CoffeeFarmList />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' })).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' }));

        expect(screen.queryByText('Celular')).not.toBeInTheDocument();
    });

    it('shows a dash for phones when the list is empty', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        const farmWithoutPhones = {
            ...mockFarms[0],
            phones: [],
        };

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify([farmWithoutPhones, mockFarms[1]]), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<CoffeeFarmList />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' })).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' }));

        const phoneLabel = screen.getByText('Teléfonos');
        const phoneValue = phoneLabel.nextElementSibling;
        expect(phoneValue).toHaveTextContent('-');
    });

    it('closes the detail modal and opens the form modal when Edit is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<CoffeeFarmList />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' })).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' }));
        expect(screen.getByRole('heading', { name: 'Finca Primavera' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Editar' }));

        expect(screen.queryByRole('heading', { name: 'Finca Primavera' })).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Editar Finca de Café', level: 2 })).toBeInTheDocument();
        expect(screen.getByLabelText(/Nombre de la Finca/i)).toHaveValue('Finca Primavera');
    });

    it('clears create form fields after closing and reopening the modal', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<CoffeeFarmList />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' })).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Agregar Finca de Café' }));
        await user.type(screen.getByLabelText(/Nombre de la Finca/i), 'Finca Temporal');

        await user.click(screen.getByRole('button', { name: 'Cerrar formulario' }));
        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: 'Crear Finca de Café', level: 2 })).not.toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Agregar Finca de Café' }));

        expect(screen.getByLabelText(/Nombre de la Finca/i)).toHaveValue('');
    });

    it('clears create form fields after closing with Cancel and reopening the modal', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<CoffeeFarmList />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' })).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Agregar Finca de Café' }));
        await user.type(screen.getByLabelText(/Nombre de la Finca/i), 'Finca Temporal');

        await user.click(screen.getByRole('button', { name: 'Cancelar' }));
        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: 'Crear Finca de Café', level: 2 })).not.toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Agregar Finca de Café' }));

        expect(screen.getByLabelText(/Nombre de la Finca/i)).toHaveValue('');
    });

    it('opens the create form modal when Agregar Finca de Café is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<CoffeeFarmList />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' })).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Agregar Finca de Café' }));

        expect(screen.getByRole('heading', { name: 'Crear Finca de Café', level: 2 })).toBeInTheDocument();
    });

    it('closes the form modal with the close button and Cancelar button', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<CoffeeFarmList />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' })).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Agregar Finca de Café' }));
        expect(screen.getByRole('heading', { name: 'Crear Finca de Café', level: 2 })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Cerrar formulario' }));
        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: 'Crear Finca de Café', level: 2 })).not.toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Agregar Finca de Café' }));
        await user.click(screen.getByRole('button', { name: 'Cancelar' }));
        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: 'Crear Finca de Café', level: 2 })).not.toBeInTheDocument();
        });
    });

    it('opens the delete confirmation modal when the modal Delete button is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockFarms), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<CoffeeFarmList />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' })).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' }));
        await user.click(screen.getByRole('button', { name: 'Eliminar' }));

        expect(screen.getByText(/¿Estás seguro de eliminar/)).toBeInTheDocument();
    });

    it('shows a loading row inside the table while data is loading', async () => {
        globalThis.fetch = vi.fn(() => new Promise(() => {}));

        renderWithRouter(<CoffeeFarmList />);

        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getAllByRole('columnheader')).toHaveLength(3);
        expect(screen.getByText('Cargando fincas de café...')).toBeInTheDocument();
        expect(screen.queryByText('No hay fincas de café registradas.')).not.toBeInTheDocument();
    });

    it('shows an empty state when no coffee farms are returned', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify([]), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<CoffeeFarmList />);

        await waitFor(() => {
            expect(screen.getByText('No hay fincas de café registradas.')).toBeInTheDocument();
        });
    });

    it('shows an error message when the API request fails', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        renderWithRouter(<CoffeeFarmList />);

        await waitFor(() => {
            expect(screen.getByText('Error al cargar las fincas de café')).toBeInTheDocument();
        });
    });

    it('removes a coffee farm after confirming deletion in the modal', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockFarms), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
            .mockResolvedValueOnce(
                new Response(null, {
                    status: 204,
                })
            );

        renderWithRouter(<CoffeeFarmList />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' })).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' }));
        await user.click(screen.getByRole('button', { name: 'Eliminar' }));
        await user.click(screen.getByRole('button', { name: 'Eliminar' }));

        await waitFor(() => {
            expect(screen.queryByRole('button', { name: 'Ver detalles de Finca Primavera' })).not.toBeInTheDocument();
        });

        expect(screen.getByRole('button', { name: 'Ver detalles de Finca Aurora' })).toBeInTheDocument();
    });

    it('shows an explicit error in the modal when deletion is rejected', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockFarms), {
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

        renderWithRouter(<CoffeeFarmList />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' })).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' }));
        await user.click(screen.getByRole('button', { name: 'Eliminar' }));
        await user.click(screen.getByRole('button', { name: 'Eliminar' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('No tiene permiso para eliminar');
        });

        expect(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' })).toBeInTheDocument();
    });

    it('refetches the list after a successful create submit', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockFarms), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ id: 'farm-new' }), {
                    status: 201,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify([...mockFarms, { id: 'farm-new', nombre_finca: 'Finca Esperanza', ciudad: 'Pitalito' }]), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            );

        renderWithRouter(<CoffeeFarmList />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' })).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Agregar Finca de Café' }));

        await user.type(screen.getByLabelText(/Nombre de la Finca/i), 'Finca Esperanza');
        await user.click(screen.getByRole('button', { name: 'Crear Finca de Café' }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledTimes(3);
        });

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Ver detalles de Finca Esperanza' })).toBeInTheDocument();
        });

        expect(screen.queryByRole('heading', { name: 'Crear Finca de Café' })).not.toBeInTheDocument();
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
                        new Response(JSON.stringify({ id: 'farm-new' }), {
                            status: 201,
                            headers: { 'Content-Type': 'application/json' },
                        })
                );
            }

            return Promise.resolve(
                new Response(JSON.stringify(mockFarms), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            );
        });

        renderWithRouter(<CoffeeFarmList />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' })).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Agregar Finca de Café' }));

        await user.type(screen.getByLabelText(/Nombre de la Finca/i), 'Finca Esperanza');
        await user.click(screen.getByRole('button', { name: 'Crear Finca de Café' }));

        await waitFor(() => {
            expect(screen.getByText('Creando...')).toBeInTheDocument();
            expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true');
        });

        act(() => {
            resolveSubmit?.();
        });

        await waitFor(() => {
            expect(screen.queryByText('Creando...')).not.toBeInTheDocument();
            expect(screen.queryByRole('heading', { name: 'Crear Finca de Café', level: 2 })).not.toBeInTheDocument();
        });
    });

    it('keeps form values when submit fails', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockFarms), {
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

        renderWithRouter(<CoffeeFarmList />);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Ver detalles de Finca Primavera' })).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Agregar Finca de Café' }));

        await user.type(screen.getByLabelText(/Nombre de la Finca/i), 'Finca Esperanza');
        await user.click(screen.getByRole('button', { name: 'Crear Finca de Café' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Error al crear la finca de café');
        });

        expect(screen.getByLabelText(/Nombre de la Finca/i)).toHaveValue('Finca Esperanza');
    });
});

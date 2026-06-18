import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { AnimalFeedProducerList } from './index';

const mockProducers = [
    {
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
        observaciones: null,
        oportunidades: null,
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
    },
    {
        id: 'producer-2',
        razon_social: 'Alimentos del Campo',
        ciudad: 'Bogotá',
        especies_manejadas: ['Aves'],
        created_at: '2026-06-02T00:00:00Z',
        updated_at: '2026-06-02T00:00:00Z',
    },
];

function renderWithRouter(ui: React.ReactElement, { initialEntries = ['/animal-feed-producers'] } = {}) {
    return render(
        <MemoryRouter initialEntries={initialEntries}>
            {ui}
        </MemoryRouter>
    );
}

describe('AnimalFeedProducerList', () => {
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

    it('renders a table with loaded producers', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockProducers), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<AnimalFeedProducerList />);

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        expect(screen.getByText('Nutrición Animal S.A.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Agregar Productor' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Crear Productor de Alimentos para Animales', level: 2 })).not.toBeInTheDocument();
    });

    it('renders exactly three summary columns with marca as primary identity', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockProducers), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<AnimalFeedProducerList />);

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        const headers = screen.getAllByRole('columnheader');
        expect(headers).toHaveLength(3);
        expect(headers[0]).toHaveTextContent('Identificación');
        expect(headers[1]).toHaveTextContent('Razón Social');
        expect(headers[2]).toHaveTextContent('Ciudad');
    });

    it('falls back to razon_social as primary identity when marca is missing', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockProducers), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<AnimalFeedProducerList />);

        await waitFor(() => {
            expect(screen.getAllByText('Alimentos del Campo').length).toBeGreaterThanOrEqual(1);
        });

        expect(screen.getByRole('button', { name: 'Ver detalles de Alimentos del Campo' })).toBeInTheDocument();
    });

    it('opens the detail modal when the table row is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockProducers), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<AnimalFeedProducerList />);

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de NutriAnimal' }));
        expect(screen.getByRole('heading', { name: 'NutriAnimal' })).toBeInTheDocument();
    });

    it('opens the detail modal when the row action button is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockProducers), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<AnimalFeedProducerList />);

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de NutriAnimal' }));
        expect(screen.getByRole('heading', { name: 'NutriAnimal' })).toBeInTheDocument();
    });

    it('opens the detail modal when the row action button is activated with Enter or Space', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockProducers), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<AnimalFeedProducerList />);

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        const rowButton = screen.getByRole('button', { name: 'Ver detalles de NutriAnimal' });
        rowButton.focus();
        await user.keyboard('{Enter}');

        expect(screen.getByRole('heading', { name: 'NutriAnimal' })).toBeInTheDocument();
    });

    it('dismisses the detail modal with the close button, Escape, and backdrop click', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockProducers), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<AnimalFeedProducerList />);

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de NutriAnimal' }));
        expect(screen.getByRole('heading', { name: 'NutriAnimal' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Cerrar detalles' }));
        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: 'NutriAnimal' })).not.toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de NutriAnimal' }));
        await user.keyboard('{Escape}');
        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: 'NutriAnimal' })).not.toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de NutriAnimal' }));
        await user.click(screen.getByRole('dialog'));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes the detail modal and opens the form modal when Edit is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockProducers), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<AnimalFeedProducerList />);

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de NutriAnimal' }));
        expect(screen.getByRole('heading', { name: 'NutriAnimal' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Editar' }));

        expect(screen.queryByRole('heading', { name: 'NutriAnimal' })).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Editar Productor de Alimentos para Animales', level: 2 })).toBeInTheDocument();
        expect(screen.getByLabelText(/Razón Social/i)).toHaveValue('Nutrición Animal S.A.');
    });

    it('opens the create form modal when Agregar Productor is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockProducers), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<AnimalFeedProducerList />);

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Agregar Productor' }));

        expect(screen.getByRole('heading', { name: 'Crear Productor de Alimentos para Animales', level: 2 })).toBeInTheDocument();
    });

    it('closes the form modal with the close button and Cancelar button', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockProducers), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<AnimalFeedProducerList />);

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Agregar Productor' }));
        expect(screen.getByRole('heading', { name: 'Crear Productor de Alimentos para Animales', level: 2 })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Cerrar formulario' }));
        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: 'Crear Productor de Alimentos para Animales', level: 2 })).not.toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Agregar Productor' }));
        await user.click(screen.getByRole('button', { name: 'Cancelar' }));
        await waitFor(() => {
            expect(screen.queryByRole('heading', { name: 'Crear Productor de Alimentos para Animales', level: 2 })).not.toBeInTheDocument();
        });
    });

    it('opens the delete confirmation modal when the modal Delete button is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockProducers), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<AnimalFeedProducerList />);

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de NutriAnimal' }));
        await user.click(screen.getByRole('button', { name: 'Eliminar' }));

        expect(screen.getByText(/¿Estás seguro de eliminar/)).toBeInTheDocument();
    });

    it('shows a loading row inside the table while data is loading', async () => {
        globalThis.fetch = vi.fn(() => new Promise(() => {}));

        renderWithRouter(<AnimalFeedProducerList />);

        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getAllByRole('columnheader')).toHaveLength(3);
        expect(screen.getByText('Cargando productores de alimentos para animales...')).toBeInTheDocument();
        expect(
            screen.queryByText('No hay productores de alimentos para animales registrados.')
        ).not.toBeInTheDocument();
    });

    it('shows an empty state when no producers are returned', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify([]), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        renderWithRouter(<AnimalFeedProducerList />);

        await waitFor(() => {
            expect(screen.getByText('No hay productores de alimentos para animales registrados.')).toBeInTheDocument();
        });
    });

    it('shows an error message when the API request fails', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        renderWithRouter(<AnimalFeedProducerList />);

        await waitFor(() => {
            expect(screen.getByText('Error al cargar los productores de alimentos para animales')).toBeInTheDocument();
        });
    });

    it('removes a producer after confirming deletion in the modal', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockProducers), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
            .mockResolvedValueOnce(
                new Response(null, {
                    status: 204,
                })
            );

        renderWithRouter(<AnimalFeedProducerList />);

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de NutriAnimal' }));
        await user.click(screen.getByRole('button', { name: 'Eliminar' }));
        await user.click(screen.getByRole('button', { name: 'Eliminar' }));

        await waitFor(() => {
            expect(screen.queryByText('NutriAnimal')).not.toBeInTheDocument();
        });

        expect(screen.getAllByText('Alimentos del Campo').length).toBeGreaterThanOrEqual(1);
    });

    it('shows an explicit error in the modal when deletion is rejected', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockProducers), {
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

        renderWithRouter(<AnimalFeedProducerList />);

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de NutriAnimal' }));
        await user.click(screen.getByRole('button', { name: 'Eliminar' }));
        await user.click(screen.getByRole('button', { name: 'Eliminar' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('No tiene permiso para eliminar');
        });

        expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
    });

    it('refetches the list after a successful create submit', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockProducers), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({ id: 'producer-new' }), {
                    status: 201,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify([...mockProducers, { id: 'producer-new', razon_social: 'Nutrición Nueva', marca: 'NutriNueva', ciudad: 'Cali' }]), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            );

        renderWithRouter(<AnimalFeedProducerList />);

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Agregar Productor' }));

        await user.type(screen.getByLabelText(/Razón Social/i), 'Nutrición Nueva');
        await user.click(screen.getByRole('button', { name: 'Crear Productor' }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledTimes(3);
        });

        await waitFor(() => {
            expect(screen.getByText('Nutrición Nueva')).toBeInTheDocument();
        });

        expect(screen.queryByRole('heading', { name: 'Crear Productor de Alimentos para Animales' })).not.toBeInTheDocument();
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
                        new Response(JSON.stringify({ id: 'producer-new' }), {
                            status: 201,
                            headers: { 'Content-Type': 'application/json' },
                        })
                );
            }

            return Promise.resolve(
                new Response(JSON.stringify(mockProducers), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            );
        });

        renderWithRouter(<AnimalFeedProducerList />);

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Agregar Productor' }));

        await user.type(screen.getByLabelText(/Razón Social/i), 'Nutrición Nueva');
        await user.click(screen.getByRole('button', { name: 'Crear Productor' }));

        await waitFor(() => {
            expect(screen.getByText('Creando...')).toBeInTheDocument();
            expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true');
        });

        act(() => {
            resolveSubmit?.();
        });

        await waitFor(() => {
            expect(screen.queryByText('Creando...')).not.toBeInTheDocument();
            expect(screen.queryByRole('heading', { name: 'Crear Productor de Alimentos para Animales', level: 2 })).not.toBeInTheDocument();
        });
    });

    it('keeps form values when submit fails', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(mockProducers), {
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

        renderWithRouter(<AnimalFeedProducerList />);

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Agregar Productor' }));

        await user.type(screen.getByLabelText(/Razón Social/i), 'Nutrición Nueva');
        await user.click(screen.getByRole('button', { name: 'Crear Productor' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Error al crear el productor de alimentos para animales');
        });

        expect(screen.getByLabelText(/Razón Social/i)).toHaveValue('Nutrición Nueva');
    });
});

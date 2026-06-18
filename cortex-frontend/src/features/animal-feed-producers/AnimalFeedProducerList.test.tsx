import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';

import { AnimalFeedProducerList } from './index';

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: vi.fn(),
    };
});

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

        render(
            <MemoryRouter>
                <AnimalFeedProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(
                screen.getByRole('heading', { name: 'Productores de Alimentos para Animales' })
            ).toBeInTheDocument();
        });

        expect(screen.getByText('Nutrición Animal S.A.')).toBeInTheDocument();
        expect(screen.getAllByText('Alimentos del Campo')).toHaveLength(2);
    });

    it('renders exactly three summary columns with marca as primary identity', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockProducers), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <AnimalFeedProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        const headers = screen.getAllByRole('columnheader');
        expect(headers).toHaveLength(3);
        expect(headers[0]).toHaveTextContent('Identificación');
        expect(headers[1]).toHaveTextContent('Razón Social');
        expect(headers[2]).toHaveTextContent('Ciudad');

        const rows = screen.getAllByRole('row');
        const firstDataRow = rows.find((row) => row.textContent?.includes('NutriAnimal'));
        expect(firstDataRow).toHaveTextContent('NutriAnimal');
        expect(firstDataRow).toHaveTextContent('Nutrición Animal S.A.');
    });

    it('falls back to razon_social as primary identity when marca is missing', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockProducers), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <AnimalFeedProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getAllByText('Alimentos del Campo')[0]).toBeInTheDocument();
        });

        const rows = screen.getAllByRole('row');
        const secondDataRow = rows.find((row) =>
            row.textContent?.includes('Alimentos del Campo')
        );
        expect(secondDataRow).toHaveTextContent('Alimentos del Campo');
        expect(secondDataRow).toHaveTextContent('Bogotá');
    });

    it('opens the detail modal when the table row is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockProducers), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <AnimalFeedProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        const rows = screen.getAllByRole('row');
        const dataRow = rows.find((row) => row.textContent?.includes('NutriAnimal'));
        expect(dataRow).toBeDefined();

        await user.click(dataRow!);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Ana López')).toBeInTheDocument();
        expect(screen.getByText('Bovinos, Porcinos')).toBeInTheDocument();
    });

    it('opens the detail modal when the row action button is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockProducers), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <AnimalFeedProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de NutriAnimal' }));

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Ana López')).toBeInTheDocument();
        expect(screen.getByText('Bovinos, Porcinos')).toBeInTheDocument();
    });

    it('opens the detail modal when the row action button is activated with Enter or Space', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockProducers), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <AnimalFeedProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        const button = screen.getByRole('button', { name: 'Ver detalles de NutriAnimal' });

        button.focus();
        await user.keyboard('{Enter}');

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Ana López')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Cerrar detalles' }));

        button.focus();
        await user.keyboard(' ');

        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('dismisses the detail modal with the close button, Escape, and backdrop click', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockProducers), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <AnimalFeedProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de NutriAnimal' }));
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Cerrar detalles' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Ver detalles de NutriAnimal' }));
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Ver detalles de NutriAnimal' }));
        await user.click(screen.getByRole('dialog'));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes the detail modal and opens the delete confirmation modal when Delete is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockProducers), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <AnimalFeedProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de NutriAnimal' }));
        expect(screen.getByRole('heading', { name: 'NutriAnimal' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Eliminar' }));

        expect(screen.queryByRole('heading', { name: 'NutriAnimal' })).not.toBeInTheDocument();
        expect(screen.getByText(/¿Estás seguro de eliminar/)).toBeInTheDocument();
    });

    it('navigates to the edit page when the modal Edit button is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        const navigate = vi.fn();
        vi.mocked(useNavigate).mockReturnValue(navigate);

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockProducers), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <AnimalFeedProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de NutriAnimal' }));
        await user.click(screen.getByRole('button', { name: 'Editar' }));

        expect(navigate).toHaveBeenCalledTimes(1);
        expect(navigate).toHaveBeenCalledWith('/animal-feed-producers/producer-1/edit');
    });

    it('opens the delete confirmation modal when the modal Delete button is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(mockProducers), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <AnimalFeedProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de NutriAnimal' }));
        await user.click(screen.getByRole('button', { name: 'Eliminar' }));

        expect(screen.getByText(/¿Estás seguro de eliminar/)).toBeInTheDocument();
    });

    it('shows an empty state when no producers are returned', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify([]), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <AnimalFeedProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('No hay productores de alimentos para animales registrados.')).toBeInTheDocument();
        });
    });

    it('shows an error message when the API request fails', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ detail: 'Service unavailable' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        render(
            <MemoryRouter>
                <AnimalFeedProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent(
                'Error al cargar los productores de alimentos para animales'
            );
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
            .mockResolvedValueOnce(new Response(null, { status: 204 }));

        render(
            <MemoryRouter>
                <AnimalFeedProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de NutriAnimal' }));
        await user.click(screen.getByRole('button', { name: 'Eliminar' }));

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/¿Estás seguro de eliminar/)).toBeInTheDocument();

        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));

        await waitFor(() => {
            expect(screen.getByText('Eliminado correctamente')).toBeInTheDocument();
        });

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        await waitFor(() => {
            expect(screen.queryByText('NutriAnimal')).not.toBeInTheDocument();
        });

        expect(screen.getAllByText('Alimentos del Campo')[0]).toBeInTheDocument();
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

        render(
            <MemoryRouter>
                <AnimalFeedProducerList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: 'Ver detalles de NutriAnimal' }));
        await user.click(screen.getByRole('button', { name: 'Eliminar' }));
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('No tiene permiso para eliminar');
        });

        expect(screen.getByText('NutriAnimal')).toBeInTheDocument();
    });
});

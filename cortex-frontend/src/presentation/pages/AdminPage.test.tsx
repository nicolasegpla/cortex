import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { AdminPage } from '@/presentation/pages/AdminPage';

const mockCreateUser = vi.fn();
const mockListUsers = vi.fn();
const mockDeleteUser = vi.fn();

vi.mock('@/services/adminUserApi', () => ({
    adminUserApi: {
        createUser: (...args: unknown[]) => mockCreateUser(...args),
        listUsers: () => mockListUsers(),
        deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
    },
}));

describe('AdminPage', () => {
    const user = userEvent.setup();

    beforeEach(() => {
        mockListUsers.mockResolvedValue([]);
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('renders user creation form and empty directory', async () => {
        render(
            <MemoryRouter>
                <AdminPage />
            </MemoryRouter>
        );

        expect(screen.getByRole('heading', { name: /administración de usuarios/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^contraseña$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/confirmar contraseña/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^rol$/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /crear usuario/i })).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText(/no hay usuarios registrados/i)).toBeInTheDocument();
        });
    });

    it('shows an error message when the user list fails to load', async () => {
        mockListUsers.mockRejectedValueOnce(new Error('Network error'));

        render(
            <MemoryRouter>
                <AdminPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Network error');
        });

        expect(screen.queryByText(/no hay usuarios registrados/i)).not.toBeInTheDocument();
    });

    it('renders the user directory returned by the API', async () => {
        mockListUsers.mockResolvedValueOnce([
            { id: 'user-1', email: 'one@example.com', role: 'operativo' },
            { id: 'user-2', email: 'two@example.com', role: 'super_admin' },
        ]);

        render(
            <MemoryRouter>
                <AdminPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('one@example.com')).toBeInTheDocument();
        });

        expect(screen.getByText('two@example.com')).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /eliminar/i })).toHaveLength(2);
    });

    it('creates a user and refreshes the list', async () => {
        mockListUsers.mockResolvedValueOnce([]);
        mockCreateUser.mockResolvedValueOnce({ id: 'new-user', email: 'new@example.com', role: 'operativo' });

        render(
            <MemoryRouter>
                <AdminPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/no hay usuarios registrados/i)).toBeInTheDocument();
        });

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/^contraseña$/i);
        const confirmInput = screen.getByLabelText(/confirmar contraseña/i);
        const roleInput = screen.getByLabelText(/^rol$/i);
        const submitButton = screen.getByRole('button', { name: /crear usuario/i });

        await user.type(emailInput, 'new@example.com');
        await user.type(passwordInput, 'secret123');
        await user.type(confirmInput, 'secret123');
        await user.clear(roleInput);
        await user.type(roleInput, 'operativo');
        await user.click(submitButton);

        await waitFor(() => {
            expect(mockCreateUser).toHaveBeenCalledWith({
                email: 'new@example.com',
                password: 'secret123',
                passwordConfirm: 'secret123',
                role: 'operativo',
            });
        });

        await waitFor(() => {
            expect(screen.getByText('new@example.com')).toBeInTheDocument();
        });
    });

    it('shows an error message when creation fails', async () => {
        mockListUsers.mockResolvedValueOnce([]);
        mockCreateUser.mockRejectedValueOnce(new Error('Passwords do not match'));

        render(
            <MemoryRouter>
                <AdminPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/no hay usuarios registrados/i)).toBeInTheDocument();
        });

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/^contraseña$/i);
        const confirmInput = screen.getByLabelText(/confirmar contraseña/i);
        const submitButton = screen.getByRole('button', { name: /crear usuario/i });

        await user.type(emailInput, 'new@example.com');
        await user.type(passwordInput, 'secret123');
        await user.type(confirmInput, 'different');
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match');
        });
    });

    it('removes a user after confirming deletion in the modal', async () => {
        const userEventWithTimers = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        vi.useFakeTimers({ shouldAdvanceTime: true });

        mockListUsers.mockResolvedValueOnce([
            { id: 'user-1', email: 'one@example.com', role: 'operativo' },
            { id: 'user-2', email: 'two@example.com', role: 'operativo' },
        ]);
        mockDeleteUser.mockResolvedValueOnce(undefined);

        render(
            <MemoryRouter>
                <AdminPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('one@example.com')).toBeInTheDocument();
        });

        await userEventWithTimers.click(screen.getAllByRole('button', { name: /eliminar/i })[0]);

        expect(screen.getByRole('dialog')).toBeInTheDocument();

        await userEventWithTimers.click(within(screen.getByRole('dialog')).getByRole('button', { name: /eliminar/i }));

        await waitFor(() => {
            expect(screen.getByText('Eliminado correctamente')).toBeInTheDocument();
        });

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        await waitFor(() => {
            expect(screen.queryByText('one@example.com')).not.toBeInTheDocument();
        });

        expect(screen.getByText('two@example.com')).toBeInTheDocument();

        vi.useRealTimers();
    });
});

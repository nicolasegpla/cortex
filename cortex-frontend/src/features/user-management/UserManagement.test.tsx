import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';

import { UserManagement } from '@/features/user-management/UserManagement';

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

function UserManagementWithCreateButton() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    return (
        <MemoryRouter>
            <UserManagement
                isCreateModalOpen={isCreateModalOpen}
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
                onCloseCreateModal={() => setIsCreateModalOpen(false)}
            />
        </MemoryRouter>
    );
}

describe('UserManagement', () => {
    const user = userEvent.setup();

    beforeEach(() => {
        mockListUsers.mockResolvedValue([]);
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('renders the empty directory', async () => {
        render(
            <MemoryRouter>
                <UserManagement />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/no hay usuarios registrados/i)).toBeInTheDocument();
        });
    });

    it('shows an error message when the user list fails to load', async () => {
        mockListUsers.mockRejectedValueOnce(new Error('Network error'));

        render(
            <MemoryRouter>
                <UserManagement />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Network error');
        });

        expect(screen.queryByText(/no hay usuarios registrados/i)).not.toBeInTheDocument();
    });

    it('shows a loading row inside the table while users are loading', async () => {
        mockListUsers.mockImplementation(() => new Promise(() => {}));

        render(
            <MemoryRouter>
                <UserManagement />
            </MemoryRouter>
        );

        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getAllByRole('columnheader')).toHaveLength(3);
        expect(screen.getByText('Cargando usuarios...')).toBeInTheDocument();
        expect(screen.queryByText(/no hay usuarios registrados/i)).not.toBeInTheDocument();
    });

    it('renders the user directory returned by the API in a table', async () => {
        mockListUsers.mockResolvedValueOnce([
            { id: 'user-1', email: 'one@example.com', role: 'operativo' },
            { id: 'user-2', email: 'two@example.com', role: 'super_admin' },
        ]);

        render(
            <MemoryRouter>
                <UserManagement />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('one@example.com')).toBeInTheDocument();
        });

        expect(screen.getByText('two@example.com')).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /eliminar/i })).toHaveLength(2);
        expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('opens and closes the invite-user modal', async () => {
        render(<UserManagementWithCreateButton />);

        await waitFor(() => {
            expect(screen.getByText(/no hay usuarios registrados/i)).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: /invitar usuario/i }));

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^rol$/i)).toBeInTheDocument();
        expect(screen.queryByLabelText(/^contraseña$/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/confirmar contraseña/i)).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /cancelar/i }));

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });

    it('closes the invite-user modal when Escape is pressed', async () => {
        render(<UserManagementWithCreateButton />);

        await waitFor(() => {
            expect(screen.getByText(/no hay usuarios registrados/i)).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: /invitar usuario/i }));
        expect(screen.getByRole('dialog', { name: /invitar usuario/i })).toBeInTheDocument();

        await user.keyboard('{Escape}');

        await waitFor(() => {
            expect(screen.queryByRole('dialog', { name: /invitar usuario/i })).not.toBeInTheDocument();
        });
    });

    it('closes the invite-user modal when the backdrop is clicked', async () => {
        render(<UserManagementWithCreateButton />);

        await waitFor(() => {
            expect(screen.getByText(/no hay usuarios registrados/i)).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: /invitar usuario/i }));
        const dialog = screen.getByRole('dialog', { name: /invitar usuario/i });
        expect(dialog).toBeInTheDocument();

        const layer = dialog.parentElement;
        expect(layer).toHaveClass('user-management__modal-layer');
        await user.click(layer!);

        await waitFor(() => {
            expect(screen.queryByRole('dialog', { name: /invitar usuario/i })).not.toBeInTheDocument();
        });
    });

    it('invites a user and refreshes the list', async () => {
        mockListUsers.mockResolvedValueOnce([]);
        mockCreateUser.mockResolvedValueOnce({ id: 'new-user', email: 'new@example.com', role: 'super_admin' });

        render(<UserManagementWithCreateButton />);

        await waitFor(() => {
            expect(screen.getByText(/no hay usuarios registrados/i)).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: /invitar usuario/i }));

        const dialog = screen.getByRole('dialog');
        const emailInput = within(dialog).getByLabelText(/email/i);
        const roleSelect = within(dialog).getByLabelText(/^rol$/i);
        const submitButton = within(dialog).getByRole('button', { name: /invitar usuario/i });

        await user.type(emailInput, 'new@example.com');
        await user.selectOptions(roleSelect, 'super_admin');
        await user.click(submitButton);

        await waitFor(() => {
            expect(mockCreateUser).toHaveBeenCalledWith({
                email: 'new@example.com',
                role: 'super_admin',
            });
        });

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        expect(screen.getByText('new@example.com')).toBeInTheDocument();
    });

    it('shows an error message when invitation fails', async () => {
        mockListUsers.mockResolvedValueOnce([]);
        mockCreateUser.mockRejectedValueOnce(new Error('User already exists'));

        render(<UserManagementWithCreateButton />);

        await waitFor(() => {
            expect(screen.getByText(/no hay usuarios registrados/i)).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: /invitar usuario/i }));

        const dialog = screen.getByRole('dialog');
        const emailInput = within(dialog).getByLabelText(/email/i);
        const submitButton = within(dialog).getByRole('button', { name: /invitar usuario/i });

        await user.type(emailInput, 'new@example.com');
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('User already exists');
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
                <UserManagement />
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

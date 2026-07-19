import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { useAuthStore } from '@/features/auth/store';

import { ConfigPage } from './ConfigPage';

vi.mock('@/features/auth/store', async () => {
    const actual = await vi.importActual('@/features/auth/store');
    return {
        ...actual,
        useAuthStore: vi.fn(),
    };
});

const mockUseAuthStore = vi.mocked(useAuthStore);

const mockListUsers = vi.fn();
const mockCreateUser = vi.fn();
const mockDeleteUser = vi.fn();

vi.mock('@/services/adminUserApi', () => ({
    adminUserApi: {
        listUsers: () => mockListUsers(),
        createUser: (...args: unknown[]) => mockCreateUser(...args),
        deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
    },
}));

describe('ConfigPage', () => {
    beforeEach(() => {
        mockListUsers.mockResolvedValue([]);
    });

    afterEach(() => {
        cleanup();
    });

    function setAuth(role: string) {
        mockUseAuthStore.mockReturnValue({
            user: { id: 'user-1', email: 'user@example.com' },
            session: { access_token: 'token' },
            role,
            isLoading: false,
            isInitialized: true,
            login: vi.fn(),
            logout: vi.fn(),
            setLoading: vi.fn(),
            setSession: vi.fn(),
            initialize: vi.fn(),
        });
    }

    it('should show only the Usuarios tab for super_admin users', () => {
        setAuth('super_admin');

        render(<ConfigPage />);

        expect(screen.getByRole('button', { name: 'Usuarios' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Proveedores de modelos' })).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Administración de usuarios' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /invitar usuario/i })).toBeInTheDocument();
    });

    it('should hide the nav sidebar and render content directly for non-admin users', () => {
        setAuth('operativo');

        const { container } = render(<ConfigPage />);

        expect(screen.queryByLabelText('Secciones de configuración')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Usuarios' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Proveedores de modelos' })).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Administración de usuarios' })).toBeInTheDocument();
        expect(container.querySelector('.config-page__body--no-nav')).toBeInTheDocument();
    });

    it('keeps a valid accessible name in the modal variant', () => {
        setAuth('super_admin');

        render(<ConfigPage variant="modal" />);

        expect(screen.getByRole('dialog', { name: 'Administración de usuarios' })).toBeInTheDocument();
    });

    it('keeps the parent modal open when the nested create-user modal opens', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        setAuth('super_admin');

        render(<ConfigPage variant="modal" onClose={onClose} />);

        await user.click(screen.getByRole('button', { name: /invitar usuario/i }));

        expect(screen.getByRole('dialog', { name: /administración de usuarios/i })).toBeInTheDocument();
        expect(screen.getByRole('dialog', { name: /invitar usuario/i })).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
    });
});

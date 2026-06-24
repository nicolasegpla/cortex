import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { useAuthStore } from '@/features/auth/store';
import { useCredentialsStore } from '@/features/chat/credentialsStore';

import { ConfigPage } from './ConfigPage';

vi.mock('@/features/chat/credentialsStore', async () => {
    const actual = await vi.importActual('@/features/chat/credentialsStore');
    return {
        ...actual,
        useCredentialsStore: vi.fn(),
    };
});

vi.mock('@/features/auth/store', async () => {
    const actual = await vi.importActual('@/features/auth/store');
    return {
        ...actual,
        useAuthStore: vi.fn(),
    };
});

const mockUseCredentialsStore = vi.mocked(useCredentialsStore);
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
        mockUseCredentialsStore.mockReturnValue({
            providers: {},
            isLoading: false,
            error: null,
            fetchCredentials: vi.fn(),
            saveCredential: vi.fn(),
            deleteCredential: vi.fn(),
            testCredential: vi.fn(),
            getValidatedProviders: () => [],
            clearError: vi.fn(),
        });

        const baseAuthState = {
            user: { id: 'user-1', email: 'user@example.com' },
            session: { access_token: 'token' },
            role: 'operativo',
            isLoading: false,
            isInitialized: true,
            login: vi.fn(),
            logout: vi.fn(),
            setLoading: vi.fn(),
            setSession: vi.fn(),
            initialize: vi.fn(),
        };

        mockUseAuthStore.mockReturnValue(baseAuthState);
        mockUseAuthStore.getState = vi.fn(() => baseAuthState);
        mockListUsers.mockResolvedValue([]);
    });

    afterEach(() => {
        cleanup();
    });

    function setSuperAdminAuth() {
        mockUseAuthStore.mockReturnValue({
            user: { id: 'user-1', email: 'admin@example.com' },
            session: { access_token: 'token' },
            role: 'super_admin',
            isLoading: false,
            isInitialized: true,
            login: vi.fn(),
            logout: vi.fn(),
            setLoading: vi.fn(),
            setSession: vi.fn(),
            initialize: vi.fn(),
        });
    }

    it('should render provider credential management on the config route', () => {
        render(<ConfigPage />);

        expect(screen.getByText('Funciones')).toBeInTheDocument();
        expect(screen.getByText('Ayuda y soporte')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Proveedores de modelos' })).toBeInTheDocument();
        expect(screen.queryByText('Perfil')).not.toBeInTheDocument();
        expect(screen.queryByText('Preferencias')).not.toBeInTheDocument();
        expect(screen.queryByText('Fuentes de datos')).not.toBeInTheDocument();
        expect(screen.getByText('Configuración')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Proveedores de modelos' })).toBeInTheDocument();
        expect(screen.getByText('Conectá y administrá las API keys que Cortex usa para acceder a tus proveedores de modelos.')).toBeInTheDocument();
    });

    it('should show the Usuarios tab only for super_admin users', () => {
        render(<ConfigPage />);

        expect(screen.queryByRole('button', { name: 'Usuarios' })).not.toBeInTheDocument();

        setSuperAdminAuth();

        cleanup();
        render(<ConfigPage />);

        expect(screen.getByRole('button', { name: 'Usuarios' })).toBeInTheDocument();
    });

    it('should switch tabs and update the header', async () => {
        const user = userEvent.setup();

        setSuperAdminAuth();

        render(<ConfigPage />);

        expect(screen.getByRole('heading', { name: 'Proveedores de modelos' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Usuarios' }));

        expect(screen.getByRole('heading', { name: 'Administración de usuarios' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /invitar usuario/i })).toBeInTheDocument();
    });

    it('keeps a valid accessible label when the Usuarios tab is active', async () => {
        const user = userEvent.setup();

        setSuperAdminAuth();
        render(<ConfigPage variant="modal" />);

        const section = screen.getByRole('dialog');
        expect(section).toHaveAttribute('aria-labelledby', 'config-title');

        await user.click(screen.getByRole('button', { name: 'Usuarios' }));

        expect(section).toHaveAttribute('aria-label', 'Administración de usuarios');
        expect(section).not.toHaveAttribute('aria-labelledby');
    });

    it('keeps the parent modal open when the nested create-user modal opens', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        setSuperAdminAuth();
        mockListUsers.mockResolvedValue([]);

        render(<ConfigPage variant="modal" onClose={onClose} />);

        await user.click(screen.getByRole('button', { name: 'Usuarios' }));
        await user.click(screen.getByRole('button', { name: /invitar usuario/i }));

        expect(screen.getByRole('dialog', { name: /administración de usuarios/i })).toBeInTheDocument();
        expect(screen.getByRole('dialog', { name: /invitar usuario/i })).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
    });
});

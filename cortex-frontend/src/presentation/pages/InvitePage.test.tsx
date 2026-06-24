import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { InvitePage } from '@/presentation/pages/InvitePage';
import { useAuthStore } from '@/features/auth/store';

const mockExchangeCodeForSession = vi.fn();
const mockUpdateUser = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('@/services/supabase/client', () => ({
    supabaseClient: {
        auth: {
            exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args),
            updateUser: (...args: unknown[]) => mockUpdateUser(...args),
        },
    },
}));

function renderWithSearchParams(search: string) {
    return render(
        <MemoryRouter initialEntries={[`/auth/invite?${search}`]}>
            <Routes>
                <Route path="/auth/invite" element={<InvitePage />} />
            </Routes>
        </MemoryRouter>
    );
}

describe('InvitePage', () => {
    const user = userEvent.setup();

    beforeEach(() => {
        useAuthStore.setState({
            user: null,
            session: null,
            role: null,
            isLoading: false,
            isInitialized: false,
        });
        mockExchangeCodeForSession.mockReset();
        mockUpdateUser.mockReset();
        mockNavigate.mockReset();
    });

    afterEach(() => {
        cleanup();
    });

    it('shows a loading state while exchanging the invite code', async () => {
        mockExchangeCodeForSession.mockImplementation(() => new Promise(() => {}));

        renderWithSearchParams('code=invite-code&type=invite');

        expect(screen.getByText(/activando tu cuenta/i)).toBeInTheDocument();
        expect(screen.getByText(/esperá un momento/i)).toBeInTheDocument();
    });

    it('shows an error when the invite code is missing', async () => {
        renderWithSearchParams('type=invite');

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('El enlace no es válido o está incompleto.');
        });
    });

    it('shows an error when the invite type is not invite', async () => {
        renderWithSearchParams('code=xyz&type=recovery');

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('El enlace no es válido o está incompleto.');
        });
    });

    it('shows an error when Supabase is not configured', async () => {
        const { supabaseClient } = await import('@/services/supabase/client');
        const originalClient = supabaseClient;
        vi.mocked(await import('@/services/supabase/client')).supabaseClient = null;

        renderWithSearchParams('code=invite-code&type=invite');

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Supabase no está configurado.');
        });

        vi.mocked(await import('@/services/supabase/client')).supabaseClient = originalClient;
    });

    it('shows an error when the code exchange fails', async () => {
        mockExchangeCodeForSession.mockResolvedValueOnce({
            data: { session: null, user: null },
            error: { message: 'Token has expired' },
        });

        renderWithSearchParams('code=expired-code&type=invite');

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('expiró');
        });
    });

    it('renders the password form after a successful code exchange', async () => {
        mockExchangeCodeForSession.mockResolvedValueOnce({
            data: {
                session: { access_token: 'invite-token' },
                user: { id: 'invited-user', email: 'invited@example.com', user_metadata: { role: 'operativo' } },
            },
            error: null,
        });

        renderWithSearchParams('code=valid-code&type=invite');

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /establecé tu contraseña/i })).toBeInTheDocument();
        });

        expect(screen.getByLabelText(/^contraseña$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/confirmar contraseña/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /activar cuenta/i })).toBeInTheDocument();
    });

    it('logs the user in after a successful code exchange', async () => {
        mockExchangeCodeForSession.mockResolvedValueOnce({
            data: {
                session: { access_token: 'invite-token' },
                user: { id: 'invited-user', email: 'invited@example.com', user_metadata: { role: 'operativo' } },
            },
            error: null,
        });

        renderWithSearchParams('code=valid-code&type=invite');

        await waitFor(() => {
            const state = useAuthStore.getState();
            expect(state.user).toEqual({ id: 'invited-user', email: 'invited@example.com' });
            expect(state.session).toEqual({ access_token: 'invite-token' });
            expect(state.role).toBe('operativo');
        });
    });

    it('shows an error when passwords do not match', async () => {
        mockExchangeCodeForSession.mockResolvedValueOnce({
            data: {
                session: { access_token: 'invite-token' },
                user: { id: 'invited-user', email: 'invited@example.com', user_metadata: { role: 'operativo' } },
            },
            error: null,
        });

        renderWithSearchParams('code=valid-code&type=invite');

        await waitFor(() => {
            expect(screen.getByLabelText(/^contraseña$/i)).toBeInTheDocument();
        });

        const passwordInput = screen.getByLabelText(/^contraseña$/i);
        const confirmInput = screen.getByLabelText(/confirmar contraseña/i);
        const submitButton = screen.getByRole('button', { name: /activar cuenta/i });

        await user.type(passwordInput, 'secret123');
        await user.type(confirmInput, 'different');
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Las contraseñas no coinciden.');
        });

        expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it('shows an error when the password is too short', async () => {
        mockExchangeCodeForSession.mockResolvedValueOnce({
            data: {
                session: { access_token: 'invite-token' },
                user: { id: 'invited-user', email: 'invited@example.com', user_metadata: { role: 'operativo' } },
            },
            error: null,
        });

        renderWithSearchParams('code=valid-code&type=invite');

        await waitFor(() => {
            expect(screen.getByLabelText(/^contraseña$/i)).toBeInTheDocument();
        });

        const passwordInput = screen.getByLabelText(/^contraseña$/i);
        const confirmInput = screen.getByLabelText(/confirmar contraseña/i);
        const submitButton = screen.getByRole('button', { name: /activar cuenta/i });

        await user.type(passwordInput, '123');
        await user.type(confirmInput, '123');
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('al menos 6 caracteres');
        });

        expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it('updates the password and redirects to the home page on success', async () => {
        mockExchangeCodeForSession.mockResolvedValueOnce({
            data: {
                session: { access_token: 'invite-token' },
                user: { id: 'invited-user', email: 'invited@example.com', user_metadata: { role: 'operativo' } },
            },
            error: null,
        });
        mockUpdateUser.mockResolvedValueOnce({ data: { user: {} }, error: null });

        renderWithSearchParams('code=valid-code&type=invite');

        await waitFor(() => {
            expect(screen.getByLabelText(/^contraseña$/i)).toBeInTheDocument();
        });

        const passwordInput = screen.getByLabelText(/^contraseña$/i);
        const confirmInput = screen.getByLabelText(/confirmar contraseña/i);
        const submitButton = screen.getByRole('button', { name: /activar cuenta/i });

        await user.type(passwordInput, 'secret123');
        await user.type(confirmInput, 'secret123');
        await user.click(submitButton);

        await waitFor(() => {
            expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'secret123' });
        });

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });

    it('shows an error when updateUser fails', async () => {
        mockExchangeCodeForSession.mockResolvedValueOnce({
            data: {
                session: { access_token: 'invite-token' },
                user: { id: 'invited-user', email: 'invited@example.com', user_metadata: { role: 'operativo' } },
            },
            error: null,
        });
        mockUpdateUser.mockResolvedValueOnce({
            data: { user: null },
            error: { message: 'Password should be different from the previous password' },
        });

        renderWithSearchParams('code=valid-code&type=invite');

        await waitFor(() => {
            expect(screen.getByLabelText(/^contraseña$/i)).toBeInTheDocument();
        });

        const passwordInput = screen.getByLabelText(/^contraseña$/i);
        const confirmInput = screen.getByLabelText(/confirmar contraseña/i);
        const submitButton = screen.getByRole('button', { name: /activar cuenta/i });

        await user.type(passwordInput, 'secret123');
        await user.type(confirmInput, 'secret123');
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('seguridad');
        });

        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('renders password requirements after a successful code exchange', async () => {
        mockExchangeCodeForSession.mockResolvedValueOnce({
            data: {
                session: { access_token: 'invite-token' },
                user: { id: 'invited-user', email: 'invited@example.com', user_metadata: { role: 'operativo' } },
            },
            error: null,
        });

        renderWithSearchParams('code=valid-code&type=invite');

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /establecé tu contraseña/i })).toBeInTheDocument();
        });

        const requirements = screen.getByRole('list', { name: /requisitos de la contraseña/i });
        expect(requirements).toBeInTheDocument();
        expect(screen.getByText('Al menos 6 caracteres')).toBeInTheDocument();
        expect(screen.getByText('Las contraseñas coinciden')).toBeInTheDocument();
    });

    it('updates password requirement indicators as the user types', async () => {
        mockExchangeCodeForSession.mockResolvedValueOnce({
            data: {
                session: { access_token: 'invite-token' },
                user: { id: 'invited-user', email: 'invited@example.com', user_metadata: { role: 'operativo' } },
            },
            error: null,
        });

        renderWithSearchParams('code=valid-code&type=invite');

        await waitFor(() => {
            expect(screen.getByLabelText(/^contraseña$/i)).toBeInTheDocument();
        });

        const passwordInput = screen.getByLabelText(/^contraseña$/i);
        const confirmInput = screen.getByLabelText(/confirmar contraseña/i);
        const lengthItem = screen.getByText('Al menos 6 caracteres', { exact: false });
        const matchItem = screen.getByText('Las contraseñas coinciden', { exact: false });

        expect(lengthItem).not.toHaveClass('password-requirements__item--valid');
        expect(matchItem).not.toHaveClass('password-requirements__item--valid');

        await user.type(passwordInput, 'secret123');

        await waitFor(() => {
            expect(lengthItem).toHaveClass('password-requirements__item--valid');
        });
        expect(matchItem).not.toHaveClass('password-requirements__item--valid');

        await user.type(confirmInput, 'secret123');

        await waitFor(() => {
            expect(matchItem).toHaveClass('password-requirements__item--valid');
        });
    });

    it('toggles password visibility for both password fields', async () => {
        mockExchangeCodeForSession.mockResolvedValueOnce({
            data: {
                session: { access_token: 'invite-token' },
                user: { id: 'invited-user', email: 'invited@example.com', user_metadata: { role: 'operativo' } },
            },
            error: null,
        });

        renderWithSearchParams('code=valid-code&type=invite');

        await waitFor(() => {
            expect(screen.getByLabelText(/^contraseña$/i)).toBeInTheDocument();
        });

        const passwordInput = screen.getByLabelText(/^contraseña$/i);
        const confirmInput = screen.getByLabelText(/confirmar contraseña/i);

        expect(passwordInput).toHaveAttribute('type', 'password');
        expect(confirmInput).toHaveAttribute('type', 'password');

        const showPassword = screen.getByRole('button', { name: 'Mostrar contraseña' });
        await user.click(showPassword);

        expect(passwordInput).toHaveAttribute('type', 'text');
        expect(showPassword).toHaveAttribute('aria-pressed', 'true');
        expect(showPassword).toHaveAttribute('aria-label', 'Ocultar contraseña');

        await user.click(showPassword);
        expect(passwordInput).toHaveAttribute('type', 'password');
        expect(showPassword).toHaveAttribute('aria-pressed', 'false');

        const showConfirm = screen.getByRole('button', { name: 'Mostrar contraseña de confirmación' });
        await user.click(showConfirm);
        expect(confirmInput).toHaveAttribute('type', 'text');
        expect(showConfirm).toHaveAttribute('aria-pressed', 'true');

        await user.click(showConfirm);
        expect(confirmInput).toHaveAttribute('type', 'password');
    });
});

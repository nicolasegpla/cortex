import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

import { LoginPage } from '@/presentation/pages/LoginPage';
import { useAuthStore } from '@/features/auth/store';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

const mockSignIn = vi.fn();

vi.mock('@/services/supabase/client', () => ({
    supabaseClient: {
        auth: {
            signInWithPassword: (...args: unknown[]) => mockSignIn(...args),
        },
    },
}));

describe('LoginPage', () => {
    const user = userEvent.setup();

    beforeEach(() => {
        useAuthStore.setState({
            user: null,
            session: null,
            role: null,
            isLoading: false,
            isInitialized: false,
        });
        mockNavigate.mockClear();
        mockSignIn.mockClear();
    });

    afterEach(() => {
        cleanup();
    });

    it('renders login form with all required elements', () => {
        render(
            <BrowserRouter>
                <LoginPage />
            </BrowserRouter>
        );

        expect(screen.getByRole('heading', { name: /iniciá sesión en cortex/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /continuar/i })).toBeInTheDocument();
        expect(screen.getByText(/ingresá tus credenciales para acceder al sistema de gestión de tu empresa/i)).toBeInTheDocument();
    });

    it('does not expose registration toggle or CTA', () => {
        render(
            <BrowserRouter>
                <LoginPage />
            </BrowserRouter>
        );

        expect(screen.queryByRole('button', { name: /crear cuenta/i })).not.toBeInTheDocument();
        expect(screen.queryByText(/registrate/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/revisá tu email/i)).not.toBeInTheDocument();
    });

    it('should login successfully and redirect', async () => {
        mockSignIn.mockResolvedValueOnce({
            data: {
                user: { id: 'user-123', email: 'test@example.com', user_metadata: { role: 'operativo' } },
                session: { access_token: 'token123' },
            },
            error: null,
        });

        render(
            <BrowserRouter>
                <LoginPage />
            </BrowserRouter>
        );

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/contraseña/i);
        const submitButton = screen.getByRole('button', { name: /continuar/i });

        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'password123');
        await user.click(submitButton);

        await waitFor(() => {
            expect(mockSignIn).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password123',
            });
        });

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });

    it('should display error on invalid credentials', async () => {
        mockSignIn.mockResolvedValueOnce({
            data: { user: null, session: null },
            error: { message: 'Invalid login credentials' },
        });

        render(
            <BrowserRouter>
                <LoginPage />
            </BrowserRouter>
        );

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/contraseña/i);
        const submitButton = screen.getByRole('button', { name: /continuar/i });

        await user.type(emailInput, 'wrong@example.com');
        await user.type(passwordInput, 'wrongpass');
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('Email o contraseña incorrectos.');
        });
    });
});

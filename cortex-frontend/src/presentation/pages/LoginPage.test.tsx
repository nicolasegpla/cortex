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
const mockSignUp = vi.fn();

vi.mock('@/services/supabase/client', () => ({
    supabaseClient: {
        auth: {
            signInWithPassword: (...args: unknown[]) => mockSignIn(...args),
            signUp: (...args: unknown[]) => mockSignUp(...args),
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
        mockSignUp.mockClear();
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
        expect(screen.getByText(/ingresá tus credenciales para acceder al sistema de gestión cervecera/i)).toBeInTheDocument();
    });

    it('should toggle to registration mode', async () => {
        render(
            <BrowserRouter>
                <LoginPage />
            </BrowserRouter>
        );

        expect(screen.getByRole('heading', { name: /iniciá sesión en cortex/i })).toBeInTheDocument();

        const toggleButton = screen.getByRole('button', { name: /^crear cuenta$/i });
        await user.click(toggleButton);

        expect(screen.getByRole('heading', { name: /^crear cuenta$/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^crear cuenta$/i })).toBeInTheDocument();
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

    it('should register successfully with confirmation', async () => {
        mockSignUp.mockResolvedValueOnce({
            data: {
                user: { id: 'new-user', email: 'new@example.com' },
                session: null,
            },
            error: null,
        });

        render(
            <BrowserRouter>
                <LoginPage />
            </BrowserRouter>
        );

        // Toggle to register mode
        await user.click(screen.getByRole('button', { name: /^crear cuenta$/i }));

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/contraseña/i);
        const submitButton = screen.getByRole('button', { name: /^crear cuenta$/i });

        await user.type(emailInput, 'new@example.com');
        await user.type(passwordInput, 'password123');
        await user.click(submitButton);

        await waitFor(() => {
            expect(mockSignUp).toHaveBeenCalledWith({
                email: 'new@example.com',
                password: 'password123',
                options: { data: { role: 'operativo' } },
            });
        });

        await waitFor(() => {
            expect(screen.getByText(/revisá tu email para confirmar tu cuenta/i)).toBeInTheDocument();
        });
    });

    it('should register and auto-login when no confirmation required', async () => {
        mockSignUp.mockResolvedValueOnce({
            data: {
                user: { id: 'new-user', email: 'new@example.com', user_metadata: { role: 'operativo' } },
                session: { access_token: 'new-token' },
            },
            error: null,
        });

        render(
            <BrowserRouter>
                <LoginPage />
            </BrowserRouter>
        );

        // Toggle to register mode
        await user.click(screen.getByRole('button', { name: /^crear cuenta$/i }));

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/contraseña/i);
        const submitButton = screen.getByRole('button', { name: /^crear cuenta$/i });

        await user.type(emailInput, 'new@example.com');
        await user.type(passwordInput, 'password123');
        await user.click(submitButton);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });
});

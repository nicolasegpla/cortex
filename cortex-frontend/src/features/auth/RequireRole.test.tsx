import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { RequireRole } from './RequireRole';
import { useAuthStore } from './store';

vi.mock('@/services/supabase/client', () => ({
    supabaseClient: null,
}));

describe('RequireRole', () => {
    beforeEach(() => {
        useAuthStore.setState({
            user: null,
            session: null,
            role: null,
            isLoading: false,
            isInitialized: false,
        });
    });

    afterEach(() => {
        cleanup();
    });

    it('should render children when user has required role', () => {
        useAuthStore.setState({
            user: { id: 'user-123', email: 'admin@example.com' },
            role: 'super_admin',
            isInitialized: true,
        });

        render(
            <MemoryRouter>
                <RequireRole allowedRoles={['super_admin']}>
                    <div data-testid="protected-content">Admin Content</div>
                </RequireRole>
            </MemoryRouter>
        );

        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    it('should render children when user has one of multiple allowed roles', () => {
        useAuthStore.setState({
            user: { id: 'user-123', email: 'user@example.com' },
            role: 'operativo',
            isInitialized: true,
        });

        render(
            <MemoryRouter>
                <RequireRole allowedRoles={['super_admin', 'operativo']}>
                    <div data-testid="protected-content">Shared Content</div>
                </RequireRole>
            </MemoryRouter>
        );

        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should redirect to login when user is not authenticated', () => {
        useAuthStore.setState({
            user: null,
            role: null,
            isInitialized: true,
        });

        render(
            <MemoryRouter initialEntries={['/admin']}>
                <Routes>
                    <Route path="/login" element={<div data-testid="login-page">Login</div>} />
                    <Route
                        path="/admin"
                        element={
                            <RequireRole allowedRoles={['super_admin']}>
                                <div data-testid="admin-content">Admin</div>
                            </RequireRole>
                        }
                    />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId('login-page')).toBeInTheDocument();
        expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    });

    it('should redirect to login when user has insufficient role', () => {
        useAuthStore.setState({
            user: { id: 'user-123', email: 'user@example.com' },
            role: 'operativo',
            isInitialized: true,
        });

        render(
            <MemoryRouter initialEntries={['/admin']}>
                <Routes>
                    <Route path="/login" element={<div data-testid="login-page">Login</div>} />
                    <Route
                        path="/admin"
                        element={
                            <RequireRole allowedRoles={['super_admin']}>
                                <div data-testid="admin-content">Admin</div>
                            </RequireRole>
                        }
                    />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId('login-page')).toBeInTheDocument();
        expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    });

    it('should show loading state while initializing', () => {
        useAuthStore.setState({
            isInitialized: false,
            isLoading: true,
        });

        render(
            <MemoryRouter>
                <RequireRole allowedRoles={['super_admin']}>
                    <div data-testid="protected-content">Admin Content</div>
                </RequireRole>
            </MemoryRouter>
        );

        expect(screen.getByText('Loading...')).toBeInTheDocument();
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
});

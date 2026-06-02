import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { ProtectedRoute } from './ProtectedRoute';
import { useAuthStore } from './store';

vi.mock('@/services/supabase/client', () => ({
    supabaseClient: null,
}));

describe('ProtectedRoute', () => {
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

    it('should show loading while initializing', () => {
        useAuthStore.setState({
            isInitialized: false,
            isLoading: true,
        });

        render(
            <MemoryRouter>
                <ProtectedRoute>
                    <div data-testid="protected-content">Protected</div>
                </ProtectedRoute>
            </MemoryRouter>
        );

        expect(screen.getByText('Loading...')).toBeInTheDocument();
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should redirect to login when not authenticated', () => {
        useAuthStore.setState({
            user: null,
            isInitialized: true,
        });

        render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <Routes>
                    <Route path="/login" element={<div data-testid="login-page">Login</div>} />
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <div data-testid="protected-content">Dashboard</div>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId('login-page')).toBeInTheDocument();
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should render children when authenticated', () => {
        useAuthStore.setState({
            user: { id: 'user-123', email: 'test@example.com' },
            role: 'operativo',
            isInitialized: true,
        });

        render(
            <MemoryRouter>
                <ProtectedRoute>
                    <div data-testid="protected-content">Dashboard</div>
                </ProtectedRoute>
            </MemoryRouter>
        );

        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should redirect unauthenticated users to login', () => {
        useAuthStore.setState({
            user: null,
            isInitialized: true,
        });

        render(
            <MemoryRouter initialEntries={['/breweries']}>
                <Routes>
                    <Route path="/login" element={<div data-testid="login-page">Login</div>} />
                    <Route
                        path="/breweries"
                        element={
                            <ProtectedRoute>
                                <div data-testid="breweries-list">Breweries</div>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByTestId('login-page')).toBeInTheDocument();
        expect(screen.queryByTestId('breweries-list')).not.toBeInTheDocument();
    });
});

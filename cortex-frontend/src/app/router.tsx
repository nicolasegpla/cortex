import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AppShell } from '@/presentation/layouts/AppShell';
import { DashboardPage } from '@/presentation/pages/DashboardPage';
import { LoginPage } from '@/presentation/pages/LoginPage';
import { SessionsPage } from '@/presentation/pages/SessionsPage';
import { ConfigPage } from '@/presentation/pages/ConfigPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { RequireRole } from '@/features/auth/RequireRole';
import { BreweryList } from '@/features/breweries/BreweryList';
import { BreweryCreate } from '@/features/breweries/BreweryCreate';
import { ChatPage } from '@/features/chat/ChatPage';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <AppShell />,
        children: [
            {
                index: true,
                element: (
                    <ProtectedRoute>
                        <ChatPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'browse',
                element: (
                    <ProtectedRoute>
                        <DashboardPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'login',
                element: <LoginPage />,
            },
            {
                path: 'register',
                element: <LoginPage />,
            },
            {
                path: 'breweries',
                element: (
                    <ProtectedRoute>
                        <BreweryList />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'breweries/new',
                element: (
                    <ProtectedRoute>
                        <BreweryCreate />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'databases',
                element: (
                    <ProtectedRoute>
                        <Navigate to="/breweries" replace />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'sessions',
                element: (
                    <ProtectedRoute>
                        <SessionsPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'config',
                element: (
                    <ProtectedRoute>
                        <ConfigPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'admin',
                element: (
                    <RequireRole allowedRoles={['super_admin']}>
                        <div>Admin Panel</div>
                    </RequireRole>
                ),
            },
        ],
    },
]);

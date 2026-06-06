import { createBrowserRouter } from 'react-router-dom';

import { MainLayout } from '@/presentation/layouts/MainLayout';
import { DashboardPage } from '@/presentation/pages/DashboardPage';
import { LoginPage } from '@/presentation/pages/LoginPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { RequireRole } from '@/features/auth/RequireRole';
import { BreweryList } from '@/features/breweries/BreweryList';
import { BreweryCreate } from '@/features/breweries/BreweryCreate';
import { ChatPage } from '@/features/chat/ChatPage';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <MainLayout />,
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

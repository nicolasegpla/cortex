import { createBrowserRouter } from 'react-router-dom';

import { MainLayout } from '@/presentation/layouts/MainLayout';
import { DashboardPage } from '@/presentation/pages/DashboardPage';
import { LoginPage } from '@/presentation/pages/LoginPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { BreweryList } from '@/features/breweries/BreweryList';
import { BreweryCreate } from '@/features/breweries/BreweryCreate';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <MainLayout />,
        children: [
            {
                index: true,
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
        ],
    },
]);

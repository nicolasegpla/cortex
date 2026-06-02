import { createBrowserRouter } from 'react-router-dom';

import { MainLayout } from '@/presentation/layouts/MainLayout';
import { DashboardPage } from '@/presentation/pages/DashboardPage';
import { LoginPage } from '@/presentation/pages/LoginPage';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <MainLayout />,
        children: [
            {
                index: true,
                element: <DashboardPage />,
            },
            {
                path: 'login',
                element: <LoginPage />,
            },
        ],
    },
]);

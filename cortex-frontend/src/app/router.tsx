import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AppShell } from '@/presentation/layouts/AppShell';
import { DashboardPage } from '@/presentation/pages/DashboardPage';
import { LoginPage } from '@/presentation/pages/LoginPage';
import { InvitePage } from '@/presentation/pages/InvitePage';
import { DatabasesPage } from '@/presentation/pages/DatabasesPage';
import { SessionsPage } from '@/presentation/pages/SessionsPage';
import { ConfigPage } from '@/presentation/pages/ConfigPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { RequireRole } from '@/features/auth/RequireRole';
import { BreweryList } from '@/features/breweries';
import { CoffeeFarmList } from '@/features/coffee-farms';
import { ChatPage } from '@/features/chat/ChatPage';
import { AnimalFeedProducerList } from '@/features/animal-feed-producers';
import { WineProducerList } from '@/features/wine-producers';

export const appRoutes = [
    {
        path: '/login',
        element: <LoginPage />,
    },
    {
        path: '/auth/invite',
        element: <InvitePage />,
    },
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
                path: 'breweries',
                element: (
                    <ProtectedRoute>
                        <BreweryList />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'coffee-farms',
                element: (
                    <ProtectedRoute>
                        <CoffeeFarmList />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'animal-feed-producers',
                element: (
                    <ProtectedRoute>
                        <AnimalFeedProducerList />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'wine-producers',
                element: (
                    <ProtectedRoute>
                        <WineProducerList />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'databases',
                element: (
                    <ProtectedRoute>
                        <DatabasesPage />
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
                        <Navigate to="/config" replace />
                    </RequireRole>
                ),
            },
        ],
    },
];

export const router = createBrowserRouter(appRoutes);

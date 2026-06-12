import { createBrowserRouter } from 'react-router-dom';

import { AppShell } from '@/presentation/layouts/AppShell';
import { DashboardPage } from '@/presentation/pages/DashboardPage';
import { LoginPage } from '@/presentation/pages/LoginPage';
import { DatabasesPage } from '@/presentation/pages/DatabasesPage';
import { SessionsPage } from '@/presentation/pages/SessionsPage';
import { ConfigPage } from '@/presentation/pages/ConfigPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { RequireRole } from '@/features/auth/RequireRole';
import { BreweryList } from '@/features/breweries/BreweryList';
import { BreweryCreate } from '@/features/breweries/BreweryCreate';
import { CoffeeFarmList, CoffeeFarmCreate } from '@/features/coffee-farms';
import { ChatPage } from '@/features/chat/ChatPage';
import { AnimalFeedProducerList, AnimalFeedProducerCreate } from '@/features/animal-feed-producers';

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
                path: 'coffee-farms',
                element: (
                    <ProtectedRoute>
                        <CoffeeFarmList />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'coffee-farms/new',
                element: (
                    <ProtectedRoute>
                        <CoffeeFarmCreate />
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
                path: 'animal-feed-producers/new',
                element: (
                    <ProtectedRoute>
                        <AnimalFeedProducerCreate />
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
                        <div>Panel de administración</div>
                    </RequireRole>
                ),
            },
        ],
    },
]);

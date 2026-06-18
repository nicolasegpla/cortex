import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createMemoryRouter, Navigate, RouterProvider } from 'react-router-dom';

import { RequireRole } from '@/features/auth/RequireRole';

import { appRoutes } from './router';

vi.mock('@/services/supabase/client', () => ({
    supabaseClient: null,
}));

interface RouteConfig {
    path?: string;
    children?: RouteConfig[];
}

function collectPaths(routes: RouteConfig[]): string[] {
    return routes.flatMap((route) => {
        const paths = route.path ? [route.path] : [];
        if (route.children) {
            return [...paths, ...collectPaths(route.children)];
        }
        return paths;
    });
}

function findRoute(routes: RouteConfig[], path: string): RouteConfig | undefined {
    for (const route of routes) {
        if (route.path === path) {
            return route;
        }
        if (route.children) {
            const found = findRoute(route.children, path);
            if (found) {
                return found;
            }
        }
    }
    return undefined;
}

function getElementType(route?: RouteConfig) {
    return (route as unknown as { element?: { type?: unknown } })?.element?.type;
}

describe('appRoutes', () => {
    afterEach(() => {
        cleanup();
    });

    it('does not expose a public /register route', () => {
        const paths = collectPaths(appRoutes);

        expect(paths).not.toContain('register');
    });

    it('redirects the legacy /admin route to /config', () => {
        const paths = collectPaths(appRoutes);

        expect(paths).toContain('admin');

        const adminRoute = findRoute(appRoutes, 'admin');
        expect(adminRoute).toBeDefined();
        expect(getElementType(adminRoute)).toBe(RequireRole);
        expect((adminRoute as unknown as { element: { props: { children: { type: unknown; props: unknown } } } }).element.props.children.type).toBe(Navigate);
        expect((adminRoute as unknown as { element: { props: { children: { props: unknown } } } }).element.props.children.props).toMatchObject({ to: '/config', replace: true });
    });

    it('renders the login page outside the app shell', () => {
        const router = createMemoryRouter(appRoutes, { initialEntries: ['/login'] });
        const { container } = render(<RouterProvider router={router} />);

        expect(screen.getByRole('heading', { name: /Iniciá sesión en Cortex/i })).toBeInTheDocument();
        expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
        expect(container.querySelector('.app-shell')).not.toBeInTheDocument();
    });
});

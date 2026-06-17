import { describe, expect, it } from 'vitest';
import { Navigate } from 'react-router-dom';

import { RequireRole } from '@/features/auth/RequireRole';

import { appRoutes } from './router';

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

describe('appRoutes', () => {
    it('does not expose a public /register route', () => {
        const paths = collectPaths(appRoutes);

        expect(paths).not.toContain('register');
    });

    it('redirects the legacy /admin route to /config', () => {
        const paths = collectPaths(appRoutes);

        expect(paths).toContain('admin');

        const adminRoute = findRoute(appRoutes, 'admin');
        expect(adminRoute).toBeDefined();
        expect(adminRoute?.element?.type).toBe(RequireRole);
        expect(adminRoute?.element?.props?.children?.type).toBe(Navigate);
        expect(adminRoute?.element?.props?.children?.props).toMatchObject({ to: '/config', replace: true });
    });
});

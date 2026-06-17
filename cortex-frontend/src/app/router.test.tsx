import { describe, expect, it } from 'vitest';

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

describe('appRoutes', () => {
    it('does not expose a public /register route', () => {
        const paths = collectPaths(appRoutes);

        expect(paths).not.toContain('register');
    });

    it('includes the admin user management route', () => {
        const paths = collectPaths(appRoutes);

        expect(paths).toContain('admin');
    });
});

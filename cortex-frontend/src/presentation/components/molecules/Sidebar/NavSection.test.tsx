import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NAV_ITEM_KIND, type NavSection } from '@/presentation/config/navigation';
import { useAuthStore } from '@/features/auth/store';

import { NavSection } from './NavSection';

const TestIcon = () => (
    <svg data-testid="test-icon" width="24" height="24">
        <circle cx="12" cy="12" r="10" />
    </svg>
);

const testSection: NavSection = {
    title: 'Sistema',
    items: [
        {
            label: 'Configuración',
            kind: NAV_ITEM_KIND.route,
            to: '/config',
            icon: TestIcon,
        },
        {
            label: 'Administración',
            kind: NAV_ITEM_KIND.route,
            to: '/admin',
            icon: TestIcon,
            requiredRole: 'super_admin',
        },
    ],
};

describe('NavSection', () => {
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

    it('renders all items when user has matching super_admin role', () => {
        useAuthStore.setState({ role: 'super_admin' });

        render(
            <MemoryRouter>
                <NavSection section={testSection} />
            </MemoryRouter>
        );

        expect(screen.getByText('Configuración')).toBeInTheDocument();
        expect(screen.getByText('Administración')).toBeInTheDocument();
    });

    it('renders admin item when user has super_admin role', () => {
        useAuthStore.setState({ role: 'super_admin' });

        render(
            <MemoryRouter>
                <NavSection section={testSection} />
            </MemoryRouter>
        );

        expect(screen.getByText('Configuración')).toBeInTheDocument();
        expect(screen.getByText('Administración')).toBeInTheDocument();
    });

    it('hides admin item when user has a different role', () => {
        useAuthStore.setState({ role: 'operativo' });

        render(
            <MemoryRouter>
                <NavSection section={testSection} />
            </MemoryRouter>
        );

        expect(screen.getByText('Configuración')).toBeInTheDocument();
        expect(screen.queryByText('Administración')).not.toBeInTheDocument();
    });

    it('hides admin item when user role is null', () => {
        render(
            <MemoryRouter>
                <NavSection section={testSection} />
            </MemoryRouter>
        );

        expect(screen.getByText('Configuración')).toBeInTheDocument();
        expect(screen.queryByText('Administración')).not.toBeInTheDocument();
    });

    it('renders nothing when all items are filtered out', () => {
        const adminOnlySection: NavSection = {
            title: 'Admin',
            items: [
                {
                    label: 'Administración',
                    kind: NAV_ITEM_KIND.route,
                    to: '/admin',
                    icon: TestIcon,
                    requiredRole: 'super_admin',
                },
            ],
        };

        useAuthStore.setState({ role: 'operativo' });

        const { container } = render(
            <MemoryRouter>
                <NavSection section={adminOnlySection} />
            </MemoryRouter>
        );

        expect(container.firstChild).toBeNull();
    });
});

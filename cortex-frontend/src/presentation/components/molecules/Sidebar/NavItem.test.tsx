import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, beforeEach } from 'vitest';

import { NavItem } from './NavItem';

beforeEach(() => {
    cleanup();
});

const TestIcon = () => (
    <svg data-testid="test-icon" width="24" height="24">
        <circle cx="12" cy="12" r="10" />
    </svg>
);

describe('NavItem', () => {
    it('should render label and icon', () => {
        render(
            <MemoryRouter>
                <NavItem label="Chat" to="/" icon={TestIcon} />
            </MemoryRouter>
        );

        expect(screen.getByText('Chat')).toBeInTheDocument();
        expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('should link to the given path', () => {
        render(
            <MemoryRouter>
                <NavItem label="Databases" to="/databases" icon={TestIcon} />
            </MemoryRouter>
        );

        expect(screen.getByRole('link', { name: /Databases/i })).toHaveAttribute('href', '/databases');
    });

    it('should show active state when route matches', () => {
        render(
            <MemoryRouter initialEntries={['/databases']}>
                <Routes>
                    <Route
                        path="/databases"
                        element={<NavItem label="Databases" to="/databases" icon={TestIcon} />}
                    />
                </Routes>
            </MemoryRouter>
        );

        const link = screen.getByRole('link', { name: /Databases/i });
        expect(link).toHaveAttribute('aria-current', 'page');
    });

    it('should not show active state when route does not match', () => {
        render(
            <MemoryRouter initialEntries={['/sessions']}>
                <Routes>
                    <Route
                        path="/sessions"
                        element={<NavItem label="Databases" to="/databases" icon={TestIcon} />}
                    />
                </Routes>
            </MemoryRouter>
        );

        const link = screen.getByRole('link', { name: /Databases/i });
        expect(link).not.toHaveAttribute('aria-current');
    });

    it('should support end prop for exact matching', () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route
                        path="/"
                        element={<NavItem label="Chat" to="/" icon={TestIcon} end />}
                    />
                </Routes>
            </MemoryRouter>
        );

        const link = screen.getByRole('link', { name: /Chat/i });
        expect(link).toHaveAttribute('aria-current', 'page');
    });
});

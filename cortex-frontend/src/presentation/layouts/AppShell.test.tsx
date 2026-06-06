import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { navigationConfig } from '@/presentation/config/navigation';

const mockToggle = vi.fn();

vi.mock('@/store/useSidebarStore', () => ({
    useSidebarStore: () => ({
        collapsed: false,
        toggle: mockToggle,
    }),
}));

vi.mock('@/store/useThemeStore', () => ({
    useThemeStore: () => ({
        theme: 'light',
        resolved: 'light',
        toggleTheme: vi.fn(),
    }),
    resolveTheme: (theme: string) => theme === 'system' ? 'light' : theme,
    syncDataTheme: vi.fn(),
}));

import { AppShell } from './AppShell';

describe('AppShell', () => {
    beforeEach(() => {
        cleanup();
        mockToggle.mockClear();
    });

    it('should render sidebar with navigation from config', () => {
        render(
            <MemoryRouter>
                <Routes>
                    <Route path="*" element={<AppShell />}>
                        <Route index element={<div>Chat Content</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        for (const section of navigationConfig) {
            expect(screen.getByText(section.title)).toBeInTheDocument();
        }
    });

    it('should render outlet content', () => {
        render(
            <MemoryRouter>
                <Routes>
                    <Route path="*" element={<AppShell />}>
                        <Route index element={<div>Chat Content</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Chat Content')).toBeInTheDocument();
    });

    it('should show app title in top bar', () => {
        render(
            <MemoryRouter>
                <Routes>
                    <Route path="*" element={<AppShell />}>
                        <Route index element={<div>Chat Content</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Cortex')).toBeInTheDocument();
    });

    it('should render theme toggle in top bar', () => {
        render(
            <MemoryRouter>
                <Routes>
                    <Route path="*" element={<AppShell />}>
                        <Route index element={<div>Chat Content</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument();
    });

    it('should mark active nav item based on current route', () => {
        render(
            <MemoryRouter initialEntries={['/breweries']}>
                <Routes>
                    <Route path="*" element={<AppShell />}>
                        <Route index element={<div>Chat</div>} />
                        <Route path="breweries" element={<div>Breweries</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        const breweriesLink = screen.getByRole('link', { name: /Cervecerías/i });
        expect(breweriesLink).toHaveAttribute('aria-current', 'page');
    });
});

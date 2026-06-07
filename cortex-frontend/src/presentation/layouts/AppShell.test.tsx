import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { navigationConfig } from '@/presentation/config/navigation';

const mockToggle = vi.fn();

vi.mock('@/presentation/pages/ConfigPage', () => ({
    ConfigPage: ({ onClose }: { onClose?: () => void }) => (
        <div role="dialog" aria-label="Configuration">
            <button type="button" onClick={onClose}>
                Close settings
            </button>
            <span>Config modal content</span>
        </div>
    ),
}));

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
            <MemoryRouter initialEntries={['/databases']}>
                <Routes>
                    <Route path="*" element={<AppShell />}>
                        <Route index element={<div>Chat</div>} />
                        <Route path="databases" element={<div>Databases</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        const databasesLink = screen.getByRole('link', { name: /Databases/i });
        expect(databasesLink).toHaveAttribute('aria-current', 'page');
    });

    it('should open settings modal from the config sidebar action', async () => {
        const user = (await import('@testing-library/user-event')).default.setup();

        render(
            <MemoryRouter>
                <Routes>
                    <Route path="*" element={<AppShell />}>
                        <Route index element={<div>Chat Content</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        await user.click(screen.getByRole('button', { name: /config/i }));

        expect(screen.getByRole('dialog', { name: /configuration/i })).toBeInTheDocument();
        expect(screen.getByText('Config modal content')).toBeInTheDocument();
    });

    it('should close settings modal from the close button', async () => {
        const user = (await import('@testing-library/user-event')).default.setup();

        render(
            <MemoryRouter>
                <Routes>
                    <Route path="*" element={<AppShell />}>
                        <Route index element={<div>Chat Content</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        await user.click(screen.getByRole('button', { name: /config/i }));
        await user.click(screen.getByRole('button', { name: /close settings/i }));

        expect(screen.queryByRole('dialog', { name: /configuration/i })).not.toBeInTheDocument();
    });
});

import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { navigationConfig } from '@/presentation/config/navigation';

const mockToggle = vi.fn();

vi.mock('@/presentation/pages/ConfigPage', async () => {
    const { useState } = await import('react');

    return {
        ConfigPage: ({ onClose }: { onClose?: () => void }) => {
            const [isNestedOpen, setIsNestedOpen] = useState(false);

            return (
                <div role="dialog" aria-label="Configuration" aria-modal="true">
                    <button type="button" onClick={onClose}>
                        Close settings
                    </button>
                    <span>Config modal content</span>
                    <button type="button" onClick={() => setIsNestedOpen(true)}>
                        Open nested modal
                    </button>
                    {isNestedOpen && (
                        <div role="dialog" aria-label="Nested modal" aria-modal="true">
                            <span>Nested content</span>
                        </div>
                    )}
                </div>
            );
        },
    };
});

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

function setupMatchMedia(matches: boolean) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
}

describe('AppShell', () => {
    beforeEach(() => {
        cleanup();
        mockToggle.mockClear();
        setupMatchMedia(false);
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
                        <Route path="databases" element={<div>Bases de datos</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        );

        const databasesLink = screen.getByRole('link', { name: /Bases de datos/i });
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

    it('should close settings modal with the Escape key', async () => {
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

        await user.keyboard('{Escape}');

        expect(screen.queryByRole('dialog', { name: /configuration/i })).not.toBeInTheDocument();
    });

    it('should not close the settings modal on Escape while a nested modal is open', async () => {
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
        await user.click(screen.getByRole('button', { name: /open nested modal/i }));

        expect(screen.getByRole('dialog', { name: /nested modal/i })).toBeInTheDocument();

        await user.keyboard('{Escape}');

        expect(screen.getByRole('dialog', { name: /configuration/i })).toBeInTheDocument();
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

    describe('mobile sidebar', () => {
        it('should show mobile menu button on mobile viewport', () => {
            setupMatchMedia(true);

            render(
                <MemoryRouter>
                    <Routes>
                        <Route path="*" element={<AppShell />}>
                            <Route index element={<div>Chat Content</div>} />
                        </Route>
                    </Routes>
                </MemoryRouter>
            );

            expect(screen.getByTestId('mobile-menu-button')).toBeInTheDocument();
        });

        it('should hide mobile menu button on desktop viewport', () => {
            render(
                <MemoryRouter>
                    <Routes>
                        <Route path="*" element={<AppShell />}>
                            <Route index element={<div>Chat Content</div>} />
                        </Route>
                    </Routes>
                </MemoryRouter>
            );

            expect(screen.queryByTestId('mobile-menu-button')).not.toBeInTheDocument();
        });

        it('should open and close mobile sidebar when menu button is clicked', async () => {
            const user = (await import('@testing-library/user-event')).default.setup();
            setupMatchMedia(true);

            render(
                <MemoryRouter>
                    <Routes>
                        <Route path="*" element={<AppShell />}>
                            <Route index element={<div>Chat Content</div>} />
                        </Route>
                    </Routes>
                </MemoryRouter>
            );

            const sidebar = screen.getByTestId('sidebar');
            expect(sidebar).toHaveClass('sidebar--collapsed');
            expect(screen.queryByTestId('mobile-sidebar-backdrop')).not.toBeInTheDocument();

            await user.click(screen.getByTestId('mobile-menu-button'));

            expect(sidebar).not.toHaveClass('sidebar--collapsed');
            expect(screen.getByTestId('mobile-sidebar-backdrop')).toBeInTheDocument();

            await user.click(screen.getByTestId('mobile-menu-button'));

            expect(sidebar).toHaveClass('sidebar--collapsed');
            expect(screen.queryByTestId('mobile-sidebar-backdrop')).not.toBeInTheDocument();
        });

        it('should close mobile sidebar when backdrop is clicked', async () => {
            const user = (await import('@testing-library/user-event')).default.setup();
            setupMatchMedia(true);

            render(
                <MemoryRouter>
                    <Routes>
                        <Route path="*" element={<AppShell />}>
                            <Route index element={<div>Chat Content</div>} />
                        </Route>
                    </Routes>
                </MemoryRouter>
            );

            await user.click(screen.getByTestId('mobile-menu-button'));
            expect(screen.getByTestId('mobile-sidebar-backdrop')).toBeInTheDocument();

            await user.click(screen.getByTestId('mobile-sidebar-backdrop'));

            expect(screen.getByTestId('sidebar')).toHaveClass('sidebar--collapsed');
            expect(screen.queryByTestId('mobile-sidebar-backdrop')).not.toBeInTheDocument();
        });

        it('should close mobile sidebar on route change', async () => {
            const user = (await import('@testing-library/user-event')).default.setup();
            setupMatchMedia(true);

            render(
                <MemoryRouter initialEntries={['/']}>
                    <Routes>
                        <Route path="*" element={<AppShell />}>
                            <Route index element={<div>Chat Content</div>} />
                            <Route path="databases" element={<div>Bases de datos</div>} />
                        </Route>
                    </Routes>
                </MemoryRouter>
            );

            await user.click(screen.getByTestId('mobile-menu-button'));
            expect(screen.getByTestId('sidebar')).not.toHaveClass('sidebar--collapsed');

            await user.click(screen.getByRole('link', { name: /Bases de datos/i }));

            expect(screen.getByTestId('sidebar')).toHaveClass('sidebar--collapsed');
        });

        it('should close mobile sidebar when opening config', async () => {
            const user = (await import('@testing-library/user-event')).default.setup();
            setupMatchMedia(true);

            render(
                <MemoryRouter>
                    <Routes>
                        <Route path="*" element={<AppShell />}>
                            <Route index element={<div>Chat Content</div>} />
                        </Route>
                    </Routes>
                </MemoryRouter>
            );

            await user.click(screen.getByTestId('mobile-menu-button'));
            expect(screen.getByTestId('sidebar')).not.toHaveClass('sidebar--collapsed');

            await user.click(screen.getByRole('button', { name: /configuración/i }));

            expect(screen.getByRole('dialog', { name: /configuration/i })).toBeInTheDocument();
            expect(screen.getByTestId('sidebar')).toHaveClass('sidebar--collapsed');
        });
    });
});

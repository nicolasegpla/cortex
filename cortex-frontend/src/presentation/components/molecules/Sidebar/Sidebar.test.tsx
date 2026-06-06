import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { navigationConfig } from '@/presentation/config/navigation';

const mockStore = {
    collapsed: false,
    toggle: vi.fn(),
};

vi.mock('@/store/useSidebarStore', () => ({
    useSidebarStore: () => mockStore,
}));

import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
    beforeEach(() => {
        cleanup();
        mockStore.collapsed = false;
        mockStore.toggle.mockClear();
    });

    it('should render all navigation sections from config', () => {
        render(
            <MemoryRouter>
                <Sidebar />
            </MemoryRouter>
        );

        for (const section of navigationConfig) {
            expect(screen.getByText(section.title)).toBeInTheDocument();
        }
    });

    it('should render all navigation items from config', () => {
        render(
            <MemoryRouter>
                <Sidebar />
            </MemoryRouter>
        );

        for (const section of navigationConfig) {
            for (const item of section.items) {
                expect(screen.getByText(item.label)).toBeInTheDocument();
            }
        }
    });

    it('should have toggle button', () => {
        render(
            <MemoryRouter>
                <Sidebar />
            </MemoryRouter>
        );

        expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeInTheDocument();
    });

    it('should call toggle when collapse button is clicked', async () => {
        const { userEvent } = await import('@testing-library/user-event');
        const user = userEvent.setup();

        render(
            <MemoryRouter>
                <Sidebar />
            </MemoryRouter>
        );

        const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i });
        await user.click(toggleButton);

        expect(mockStore.toggle).toHaveBeenCalledTimes(1);
    });

    it('should apply collapsed class when collapsed is true', () => {
        mockStore.collapsed = true;

        render(
            <MemoryRouter>
                <Sidebar />
            </MemoryRouter>
        );

        const sidebar = screen.getByTestId('sidebar');
        expect(sidebar).toHaveClass('sidebar--collapsed');
    });

    it('should highlight active nav item based on current route', () => {
        render(
            <MemoryRouter initialEntries={['/breweries']}>
                <Sidebar />
            </MemoryRouter>
        );

        const breweriesLink = screen.getByRole('link', { name: /Cervecerías/i });
        expect(breweriesLink).toHaveAttribute('aria-current', 'page');
    });

    it('should not highlight inactive nav items', () => {
        render(
            <MemoryRouter initialEntries={['/breweries']}>
                <Sidebar />
            </MemoryRouter>
        );

        const sessionsLink = screen.getByRole('link', { name: /Sessions/i });
        expect(sessionsLink).not.toHaveAttribute('aria-current');
    });
});

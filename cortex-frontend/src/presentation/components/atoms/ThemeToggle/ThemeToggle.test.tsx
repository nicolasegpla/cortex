import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('ThemeToggle', () => {
    beforeEach(() => {
        cleanup();
        localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
        vi.resetModules();
    });

    const mockMatchMedia = (matchesDark = false) => {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: matchesDark && query === '(prefers-color-scheme: dark)',
                media: query,
                onchange: null,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
    };

    it('should render a button', async () => {
        mockMatchMedia(false);
        const { ThemeToggle } = await import('./ThemeToggle');
        render(<ThemeToggle />);
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should set data-theme to light on mount when system prefers light', async () => {
        mockMatchMedia(false);
        const { ThemeToggle } = await import('./ThemeToggle');
        render(<ThemeToggle />);
        await waitFor(() => {
            expect(document.documentElement.dataset.theme).toBe('light');
        });
    });

    it('should set data-theme to dark on mount when system prefers dark', async () => {
        mockMatchMedia(true);
        const { ThemeToggle } = await import('./ThemeToggle');
        render(<ThemeToggle />);
        await waitFor(() => {
            expect(document.documentElement.dataset.theme).toBe('dark');
        });
    });

    it('should toggle data-theme on button click', async () => {
        mockMatchMedia(false);
        const user = userEvent.setup();
        const { ThemeToggle } = await import('./ThemeToggle');
        render(<ThemeToggle />);

        await waitFor(() => {
            expect(document.documentElement.dataset.theme).toBe('light');
        });

        await user.click(screen.getByRole('button'));
        expect(document.documentElement.dataset.theme).toBe('dark');

        await user.click(screen.getByRole('button'));
        expect(document.documentElement.dataset.theme).toBe('light');
    });

    it('should read system preference on mount when theme is system', async () => {
        const matchMediaSpy = vi.fn().mockImplementation((query: string) => ({
            matches: query === '(prefers-color-scheme: dark)',
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: matchMediaSpy,
        });

        const { ThemeToggle } = await import('./ThemeToggle');
        render(<ThemeToggle />);

        await waitFor(() => {
            expect(matchMediaSpy).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
        });
    });

    it('should persist theme choice to localStorage after toggle', async () => {
        mockMatchMedia(false);
        const user = userEvent.setup();
        const { ThemeToggle } = await import('./ThemeToggle');
        render(<ThemeToggle />);

        await waitFor(() => {
            expect(document.documentElement.dataset.theme).toBe('light');
        });

        await user.click(screen.getByRole('button'));
        expect(document.documentElement.dataset.theme).toBe('dark');

        // Allow persist middleware to write to localStorage
        await new Promise((resolve) => setTimeout(resolve, 20));

        const saved = JSON.parse(localStorage.getItem('cortex-theme') || '{}');
        expect(saved.state.theme).toBe('dark');
    });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock matchMedia BEFORE importing the store (it's called at module load time)
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

describe('useThemeStore', () => {
    beforeEach(() => {
        mockMatchMedia(false);
        localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
        // Reset module cache to re-trigger module-level initialization
        vi.resetModules();
    });

    it('should have default state with system theme', async () => {
        mockMatchMedia(false);
        const { useThemeStore } = await import('./useThemeStore');
        const state = useThemeStore.getState();
        expect(state.theme).toBe('system');
        expect(state.resolved).toBe('light');
    });

    it('should resolve system theme to dark when prefers-color-scheme is dark', async () => {
        mockMatchMedia(true);
        const { useThemeStore } = await import('./useThemeStore');
        const state = useThemeStore.getState();
        expect(state.theme).toBe('system');
        expect(state.resolved).toBe('dark');
    });

    it('should set theme to light', async () => {
        mockMatchMedia(false);
        const { useThemeStore } = await import('./useThemeStore');
        useThemeStore.getState().setTheme('light');
        expect(useThemeStore.getState().theme).toBe('light');
        expect(useThemeStore.getState().resolved).toBe('light');
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should set theme to dark', async () => {
        mockMatchMedia(false);
        const { useThemeStore } = await import('./useThemeStore');
        useThemeStore.getState().setTheme('dark');
        expect(useThemeStore.getState().theme).toBe('dark');
        expect(useThemeStore.getState().resolved).toBe('dark');
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should toggle theme between light and dark', async () => {
        mockMatchMedia(false);
        const { useThemeStore } = await import('./useThemeStore');
        
        useThemeStore.getState().setTheme('light');
        expect(useThemeStore.getState().resolved).toBe('light');
        
        useThemeStore.getState().toggleTheme();
        expect(useThemeStore.getState().theme).toBe('dark');
        expect(useThemeStore.getState().resolved).toBe('dark');
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        
        useThemeStore.getState().toggleTheme();
        expect(useThemeStore.getState().theme).toBe('light');
        expect(useThemeStore.getState().resolved).toBe('light');
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should persist theme choice to localStorage via persist middleware', async () => {
        mockMatchMedia(false);
        const { useThemeStore } = await import('./useThemeStore');
        useThemeStore.getState().setTheme('dark');
        
        // The persist middleware saves asynchronously; check after a tick
        await new Promise((resolve) => setTimeout(resolve, 10));
        
        const saved = JSON.parse(localStorage.getItem('cortex-theme') || '{}');
        expect(saved.state.theme).toBe('dark');
    });
});

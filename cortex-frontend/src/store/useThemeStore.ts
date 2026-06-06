import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return 'light';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
    if (theme === 'system') return getSystemTheme();
    return theme;
}

export function syncDataTheme(resolved: 'light' | 'dark') {
    if (typeof document !== 'undefined') {
        document.documentElement.dataset.theme = resolved;
    }
}

interface ThemeState {
    theme: Theme;
    resolved: 'light' | 'dark';
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: 'system',
            resolved: resolveTheme('system'),

            setTheme: (theme) => {
                const resolved = resolveTheme(theme);
                syncDataTheme(resolved);
                set({ theme, resolved });
            },

            toggleTheme: () => {
                set((state) => {
                    const nextTheme: Theme = state.theme === 'dark' ? 'light' : 'dark';
                    const resolved = resolveTheme(nextTheme);
                    syncDataTheme(resolved);
                    return { theme: nextTheme, resolved };
                });
            },
        }),
        {
            name: 'cortex-theme',
            partialize: (state) => ({ theme: state.theme }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    const resolved = resolveTheme(state.theme);
                    syncDataTheme(resolved);
                    (state as ThemeState).resolved = resolved;
                }
            },
        }
    )
);

// Safe initial sync — runs once on module load in browser environments
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    try {
        const currentTheme = useThemeStore.getState().theme;
        const currentResolved = resolveTheme(currentTheme);
        syncDataTheme(currentResolved);
    } catch {
        // Silently fail in test environments where matchMedia may not be available
    }
}

import { useEffect } from 'react';

import { useThemeStore, resolveTheme, syncDataTheme } from '@/store/useThemeStore';
import { Sun } from '../Icon/Sun';
import { Moon } from '../Icon/Moon';

export function ThemeToggle() {
    const { theme, resolved, toggleTheme } = useThemeStore();

    useEffect(() => {
        // Ensure data-theme is synced with the current resolved theme on mount
        const currentResolved = resolveTheme(theme);
        syncDataTheme(currentResolved);
    }, [theme]);

    const label = `Switch to ${resolved === 'dark' ? 'light' : 'dark'} mode`;

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={label}
            title={label}
            data-testid="theme-toggle"
        >
            {resolved === 'dark' ? <Sun width={20} height={20} /> : <Moon width={20} height={20} />}
        </button>
    );
}

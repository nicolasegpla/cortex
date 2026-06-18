import { useEffect } from 'react';

import { useThemeStore, resolveTheme, syncDataTheme } from '@/store/useThemeStore';
import './theme-toggle.scss';

const SUN_ICON = '/icons8-sol-120.png';
const MOON_ICON = '/icons8-luna-llena-96.png';

export function ThemeToggle() {
    const { theme, resolved, toggleTheme } = useThemeStore();

    useEffect(() => {
        // Ensure data-theme is synced with the current resolved theme on mount
        const currentResolved = resolveTheme(theme);
        syncDataTheme(currentResolved);
    }, [theme]);

    const label = `Switch to ${resolved === 'dark' ? 'light' : 'dark'} mode`;
    const iconSrc = resolved === 'dark' ? SUN_ICON : MOON_ICON;

    return (
        <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={label}
            title={label}
            data-testid="theme-toggle"
        >
            <img src={iconSrc} alt="" className="theme-toggle__icon" />
        </button>
    );
}

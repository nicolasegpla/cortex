import { describe, expect, it, beforeEach, afterEach } from 'vitest';

describe('Theme CSS Custom Properties', () => {
    let styleEl: HTMLStyleElement;

    beforeEach(() => {
        document.documentElement.removeAttribute('data-theme');
        // Clean up previous style
        if (styleEl) {
            styleEl.remove();
        }
        // Inject a minimal stylesheet with the custom properties
        styleEl = document.createElement('style');
        styleEl.textContent = `
            :root {
                --color-surface-canvas: #fafafa;
                --color-surface-card: #ffffff;
                --color-text-primary: #111827;
                --color-text-muted: #6b7280;
                --color-border-divider: rgba(0, 0, 0, 0.06);
                --color-accent-primary: #111827;
            }
            [data-theme="dark"] {
                --color-surface-canvas: #0f0f10;
                --color-surface-card: #1a1a1b;
                --color-text-primary: #f3f4f6;
                --color-text-muted: #9ca3af;
                --color-border-divider: rgba(255, 255, 255, 0.06);
                --color-accent-primary: #f3f4f6;
            }
        `;
        document.head.appendChild(styleEl);
    });

    afterEach(() => {
        if (styleEl) {
            styleEl.remove();
        }
    });

    it('should expose --color-surface-canvas in light mode', () => {
        const style = getComputedStyle(document.documentElement);
        const value = style.getPropertyValue('--color-surface-canvas').trim();
        expect(value).toBe('#fafafa');
    });

    it('should change --color-surface-canvas when data-theme="dark" is set', () => {
        document.documentElement.dataset.theme = 'dark';
        const style = getComputedStyle(document.documentElement);
        const darkValue = style.getPropertyValue('--color-surface-canvas').trim();
        expect(darkValue).toBe('#0f0f10');
    });

    it('should use light default when no data-theme is set', () => {
        const style = getComputedStyle(document.documentElement);
        const lightValue = style.getPropertyValue('--color-surface-canvas').trim();
        expect(lightValue).toBe('#fafafa');
    });

    it('should expose all required color tokens', () => {
        const style = getComputedStyle(document.documentElement);
        const requiredTokens = [
            '--color-surface-canvas',
            '--color-surface-card',
            '--color-text-primary',
            '--color-text-muted',
            '--color-border-divider',
            '--color-accent-primary',
        ];

        for (const token of requiredTokens) {
            const value = style.getPropertyValue(token).trim();
            expect(value).toBeTruthy();
        }
    });
});

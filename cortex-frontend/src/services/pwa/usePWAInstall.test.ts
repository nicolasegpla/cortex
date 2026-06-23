import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePWAInstall } from './usePWAInstall';

interface MockBeforeInstallPromptEvent extends Event {
    prompt: ReturnType<typeof vi.fn>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const originalNavigator = globalThis.navigator;
const originalUserAgent = navigator.userAgent;

function setUserAgent(userAgent: string): void {
    vi.stubGlobal('navigator', {
        ...originalNavigator,
        userAgent,
        standalone: undefined,
    });
}

function setStandalone(standalone: boolean): void {
    vi.stubGlobal('navigator', {
        ...originalNavigator,
        userAgent: originalUserAgent,
        standalone,
    });
}

function createMockBeforeInstallPromptEvent(outcome: 'accepted' | 'dismissed' = 'accepted'): MockBeforeInstallPromptEvent {
    const event = new Event('beforeinstallprompt', { bubbles: false, cancelable: true });

    return Object.assign(event, {
        prompt: vi.fn(),
        userChoice: Promise.resolve({ outcome }),
    });
}

function stubMatchMedia(matches: boolean): void {
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({
            matches: query === '(display-mode: standalone)' ? matches : false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    );
}

describe('usePWAInstall', () => {
    beforeEach(() => {
        cleanup();
        vi.restoreAllMocks();
        stubMatchMedia(false);
        vi.stubGlobal('navigator', originalNavigator);
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it('reports installation unavailable when no beforeinstallprompt event has fired', () => {
        const { result } = renderHook(() => usePWAInstall());

        expect(result.current.isInstallable).toBe(false);
        expect(result.current.isInstalled).toBe(false);
    });

    it('reports installed when launched in standalone display mode', () => {
        vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
            matches: query === '(display-mode: standalone)',
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })));

        const { result } = renderHook(() => usePWAInstall());

        expect(result.current.isInstalled).toBe(true);
    });

    it('reports installed when navigator.standalone is true on iOS', () => {
        setStandalone(true);

        const { result } = renderHook(() => usePWAInstall());

        expect(result.current.isInstalled).toBe(true);
    });

    it('reports eligible for manual iOS install when running Safari on iPhone and not standalone', () => {
        setUserAgent(
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        );

        const { result } = renderHook(() => usePWAInstall());

        expect(result.current.isManualInstallEligible).toBe(true);
    });

    it('does not report manual iOS install eligibility for Chrome on iOS', () => {
        setUserAgent(
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1',
        );

        const { result } = renderHook(() => usePWAInstall());

        expect(result.current.isManualInstallEligible).toBe(false);
    });

    it('does not report manual iOS install eligibility on Android', () => {
        setUserAgent(
            'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        );

        const { result } = renderHook(() => usePWAInstall());

        expect(result.current.isManualInstallEligible).toBe(false);
    });

    it('does not report manual iOS install eligibility when already in standalone mode', () => {
        vi.stubGlobal('navigator', {
            ...originalNavigator,
            userAgent:
                'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            standalone: true,
        });

        const { result } = renderHook(() => usePWAInstall());

        expect(result.current.isManualInstallEligible).toBe(false);
        expect(result.current.isInstalled).toBe(true);
    });

    it('reports installable after capturing beforeinstallprompt and calls prompt on request', async () => {
        const deferredPrompt = createMockBeforeInstallPromptEvent('accepted');

        const { result } = renderHook(() => usePWAInstall());

        window.dispatchEvent(deferredPrompt);

        await waitFor(() => {
            expect(result.current.isInstallable).toBe(true);
        });

        const accepted = await result.current.promptInstall();

        expect(deferredPrompt.prompt).toHaveBeenCalledOnce();
        expect(accepted).toBe(true);
    });

    it('returns false when the user dismisses the install prompt', async () => {
        const deferredPrompt = createMockBeforeInstallPromptEvent('dismissed');

        const { result } = renderHook(() => usePWAInstall());

        window.dispatchEvent(deferredPrompt);

        await waitFor(() => {
            expect(result.current.isInstallable).toBe(true);
        });

        const accepted = await result.current.promptInstall();

        expect(accepted).toBe(false);
    });

    it('marks installed and no longer installable after appinstalled fires', async () => {
        const deferredPrompt = createMockBeforeInstallPromptEvent('accepted');

        const { result } = renderHook(() => usePWAInstall());

        window.dispatchEvent(deferredPrompt);

        await waitFor(() => {
            expect(result.current.isInstallable).toBe(true);
        });

        window.dispatchEvent(new Event('appinstalled'));

        await waitFor(() => {
            expect(result.current.isInstalled).toBe(true);
            expect(result.current.isInstallable).toBe(false);
        });
    });

    it('only uses the first captured beforeinstallprompt event', async () => {
        const firstPrompt = createMockBeforeInstallPromptEvent('accepted');
        const secondPrompt = createMockBeforeInstallPromptEvent('accepted');

        const { result } = renderHook(() => usePWAInstall());

        window.dispatchEvent(firstPrompt);
        window.dispatchEvent(secondPrompt);

        await waitFor(() => {
            expect(result.current.isInstallable).toBe(true);
        });

        await result.current.promptInstall();

        expect(firstPrompt.prompt).toHaveBeenCalledOnce();
        expect(secondPrompt.prompt).not.toHaveBeenCalled();
    });
});

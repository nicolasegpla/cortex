import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    isDisplayModeStandalone,
    isIOSManualInstallEligible,
    isIOSStandalone,
    isIOSSafari,
    isStandalone,
} from './detectIOS';

const originalNavigator = globalThis.navigator;
const originalUserAgent = navigator.userAgent;

function setUserAgent(userAgent: string, standalone: boolean | undefined = undefined): void {
    vi.stubGlobal('navigator', {
        ...originalNavigator,
        userAgent,
        standalone,
    });
}

function stubStandaloneMediaQuery(matches: boolean): void {
    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({
            matches: query === '(display-mode: standalone)' ? matches : false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    );
}

describe('detectIOS', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.stubGlobal('navigator', originalNavigator);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('isDisplayModeStandalone', () => {
        it('returns true when the display-mode standalone media query matches', () => {
            stubStandaloneMediaQuery(true);

            expect(isDisplayModeStandalone()).toBe(true);
        });

        it('returns false when the display-mode standalone media query does not match', () => {
            stubStandaloneMediaQuery(false);

            expect(isDisplayModeStandalone()).toBe(false);
        });
    });

    describe('isIOSStandalone', () => {
        it('returns true when navigator.standalone is true', () => {
            setUserAgent(originalUserAgent, true);

            expect(isIOSStandalone()).toBe(true);
        });

        it('returns false when navigator.standalone is false', () => {
            setUserAgent(originalUserAgent, false);

            expect(isIOSStandalone()).toBe(false);
        });

        it('returns false when navigator.standalone is undefined', () => {
            setUserAgent(originalUserAgent, undefined);

            expect(isIOSStandalone()).toBe(false);
        });
    });

    describe('isStandalone', () => {
        it('returns true when display-mode standalone matches', () => {
            stubStandaloneMediaQuery(true);
            setUserAgent(originalUserAgent, false);

            expect(isStandalone()).toBe(true);
        });

        it('returns true when navigator.standalone is true', () => {
            stubStandaloneMediaQuery(false);
            setUserAgent(originalUserAgent, true);

            expect(isStandalone()).toBe(true);
        });

        it('returns false when neither standalone condition is met', () => {
            stubStandaloneMediaQuery(false);
            setUserAgent(originalUserAgent, false);

            expect(isStandalone()).toBe(false);
        });
    });

    describe('isIOSSafari', () => {
        it('returns true for Safari on iPhone', () => {
            setUserAgent(
                'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            );

            expect(isIOSSafari()).toBe(true);
        });

        it('returns true for Safari on iPad', () => {
            setUserAgent(
                'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            );

            expect(isIOSSafari()).toBe(true);
        });

        it('returns false for Chrome on iOS', () => {
            setUserAgent(
                'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1',
            );

            expect(isIOSSafari()).toBe(false);
        });

        it('returns false for Firefox on iOS', () => {
            setUserAgent(
                'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/605.1.15',
            );

            expect(isIOSSafari()).toBe(false);
        });

        it('returns false for Edge on iOS', () => {
            setUserAgent(
                'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/120.0.2210.121 Mobile/15E148 Safari/605.1.15',
            );

            expect(isIOSSafari()).toBe(false);
        });

        it('returns false for Android Chrome', () => {
            setUserAgent(
                'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
            );

            expect(isIOSSafari()).toBe(false);
        });

        it('returns false for desktop Safari', () => {
            setUserAgent(
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
            );

            expect(isIOSSafari()).toBe(false);
        });
    });

    describe('isIOSManualInstallEligible', () => {
        it('returns true for iOS Safari when not in standalone mode', () => {
            stubStandaloneMediaQuery(false);
            setUserAgent(
                'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                false,
            );

            expect(isIOSManualInstallEligible()).toBe(true);
        });

        it('returns false when already in standalone mode', () => {
            stubStandaloneMediaQuery(false);
            setUserAgent(
                'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                true,
            );

            expect(isIOSManualInstallEligible()).toBe(false);
        });

        it('returns false for non-iOS browsers', () => {
            stubStandaloneMediaQuery(false);
            setUserAgent(
                'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                false,
            );

            expect(isIOSManualInstallEligible()).toBe(false);
        });
    });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerServiceWorker } from './registerSW';

const originalNavigator = globalThis.navigator;

describe('registerServiceWorker', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
        vi.stubEnv('DEV', false);
        vi.stubGlobal('navigator', originalNavigator);
    });

    afterEach(() => {
        vi.stubGlobal('navigator', originalNavigator);
    });

    it('does nothing in development', () => {
        vi.stubEnv('DEV', true);

        const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

        registerServiceWorker();

        expect(addEventListenerSpy).not.toHaveBeenCalled();
    });

    it('does nothing when service workers are not supported', () => {
        vi.stubGlobal('navigator', {});

        const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

        registerServiceWorker();

        expect(addEventListenerSpy).not.toHaveBeenCalled();
    });

    it('registers the service worker after window load', async () => {
        const registerMock = vi.fn().mockResolvedValue({ scope: '/' });

        vi.stubGlobal('navigator', {
            serviceWorker: { register: registerMock },
        });

        const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

        registerServiceWorker();

        expect(addEventListenerSpy).toHaveBeenCalledWith('load', expect.any(Function));

        const loadHandler = addEventListenerSpy.mock.calls[0][1] as EventListener;
        loadHandler(new Event('load'));

        await vi.waitFor(() => {
            expect(registerMock).toHaveBeenCalledWith('/sw.js');
        });
    });
});

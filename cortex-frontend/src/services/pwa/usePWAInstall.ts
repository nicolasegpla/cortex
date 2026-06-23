import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { isIOSManualInstallEligible, isStandalone } from './detectIOS';

export interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UsePWAInstallReturn {
    isInstallable: boolean;
    isInstalled: boolean;
    isManualInstallEligible: boolean;
    promptInstall: () => Promise<boolean>;
}

export function usePWAInstall(): UsePWAInstallReturn {
    const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(() => isStandalone());
    const isManualInstallEligible = useMemo(() => isIOSManualInstallEligible(), []);

    const promptInstall = useCallback(async (): Promise<boolean> => {
        const deferredPrompt = deferredPromptRef.current;

        if (!deferredPrompt) {
            return false;
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        deferredPromptRef.current = null;
        setIsInstallable(false);

        return outcome === 'accepted';
    }, []);

    useEffect(() => {
        const handleBeforeInstallPrompt = (event: Event): void => {
            event.preventDefault();

            if (deferredPromptRef.current) {
                return;
            }

            deferredPromptRef.current = event as BeforeInstallPromptEvent;
            setIsInstallable(true);
        };

        const handleAppInstalled = (): void => {
            deferredPromptRef.current = null;
            setIsInstallable(false);
            setIsInstalled(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    return { isInstallable, isInstalled, isManualInstallEligible, promptInstall };
}

export function isDisplayModeStandalone(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.matchMedia('(display-mode: standalone)').matches;
}

export function isIOSStandalone(): boolean {
    if (typeof navigator === 'undefined') {
        return false;
    }

    return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isStandalone(): boolean {
    return isDisplayModeStandalone() || isIOSStandalone();
}

export function isIOSSafari(): boolean {
    if (typeof navigator === 'undefined') {
        return false;
    }

    const userAgent = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

    if (!isIOS) {
        return false;
    }

    const isChrome = /CriOS/i.test(userAgent);
    const isFirefox = /FxiOS/i.test(userAgent);
    const isEdge = /EdgiOS/i.test(userAgent);
    const isOpera = /OPTi/i.test(userAgent);

    return !isChrome && !isFirefox && !isEdge && !isOpera;
}

export function isIOSManualInstallEligible(): boolean {
    return isIOSSafari() && !isStandalone();
}

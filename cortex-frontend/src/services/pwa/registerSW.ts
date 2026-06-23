export function registerServiceWorker(): void {
    if (import.meta.env.DEV || !('serviceWorker' in navigator)) {
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
                // eslint-disable-next-line no-console
                console.log('Service Worker registered:', registration.scope);
            })
            .catch((error) => {
                // eslint-disable-next-line no-console
                console.error('Service Worker registration failed:', error);
            });
    });
}

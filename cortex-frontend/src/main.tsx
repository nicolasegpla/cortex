import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { router } from '@/app/router';
import { useAuthStore } from '@/features/auth/store';
import '@/presentation/styles/index.scss';
import { registerServiceWorker } from '@/services/pwa/registerSW';

import { RouterProvider } from 'react-router-dom';

const rootElement = document.getElementById('root');

if (!rootElement) {
    throw new Error('Root element not found');
}

// Initialize auth state before rendering
useAuthStore.getState().initialize();

createRoot(rootElement).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>,
);

registerServiceWorker();

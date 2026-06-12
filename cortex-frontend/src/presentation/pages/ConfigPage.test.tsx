import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { useCredentialsStore } from '@/features/chat/credentialsStore';

import { ConfigPage } from './ConfigPage';

vi.mock('@/features/chat/credentialsStore', async () => {
    const actual = await vi.importActual('@/features/chat/credentialsStore');
    return {
        ...actual,
        useCredentialsStore: vi.fn(),
    };
});

const mockUseCredentialsStore = vi.mocked(useCredentialsStore);

describe('ConfigPage', () => {
    beforeEach(() => {
        mockUseCredentialsStore.mockReturnValue({
            providers: {},
            isLoading: false,
            error: null,
            fetchCredentials: vi.fn(),
            saveCredential: vi.fn(),
            deleteCredential: vi.fn(),
            testCredential: vi.fn(),
            getValidatedProviders: () => [],
            clearError: vi.fn(),
        });
    });

    it('should render provider credential management on the config route', () => {
        render(<ConfigPage />);

        expect(screen.getByText('Funciones')).toBeInTheDocument();
        expect(screen.getByText('Ayuda y soporte')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Proveedores de modelos' })).toBeInTheDocument();
        expect(screen.queryByText('Perfil')).not.toBeInTheDocument();
        expect(screen.queryByText('Preferencias')).not.toBeInTheDocument();
        expect(screen.queryByText('Fuentes de datos')).not.toBeInTheDocument();
        expect(screen.getByText('Configuración')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Proveedores de modelos' })).toBeInTheDocument();
        expect(screen.getByText('Conectá y administrá las API keys que Cortex usa para acceder a tus proveedores de modelos.')).toBeInTheDocument();
    });
});

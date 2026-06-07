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

        expect(screen.getByText('Cortex workspace')).toBeInTheDocument();
        expect(screen.getByText('Local configuration')).toBeInTheDocument();
        expect(screen.getByText('Account')).toBeInTheDocument();
        expect(screen.getByText('Features')).toBeInTheDocument();
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Preferences')).toBeInTheDocument();
        expect(screen.getByText('Data sources')).toBeInTheDocument();
        expect(screen.getByText('Help & support')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Model providers' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Profile' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Preferences' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Data sources' })).not.toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Model providers' })).toBeInTheDocument();
        expect(screen.getByText('Connect and manage the API keys Cortex uses to access your model providers.')).toBeInTheDocument();
    });
});

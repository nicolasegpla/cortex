import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useCredentialsStore } from './credentialsStore';
import { ChatSettings } from './ChatSettings';

vi.mock('./credentialsStore', async () => {
    const actual = await vi.importActual('./credentialsStore');
    return {
        ...actual,
        useCredentialsStore: vi.fn(),
    };
});

const mockUseCredentialsStore = vi.mocked(useCredentialsStore);

describe('ChatSettings', () => {
    const mockFetchCredentials = vi.fn();
    const mockSaveCredential = vi.fn();
    const mockDeleteCredential = vi.fn();
    const mockTestCredential = vi.fn();
    const mockClearError = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseCredentialsStore.mockReturnValue({
            providers: {},
            isLoading: false,
            error: null,
            fetchCredentials: mockFetchCredentials,
            saveCredential: mockSaveCredential,
            deleteCredential: mockDeleteCredential,
            testCredential: mockTestCredential,
            getValidatedProviders: () => [],
            clearError: mockClearError,
        });
    });

    it('should render provider credential forms', () => {
        render(<ChatSettings />);

        expect(screen.getByText('Provider Credentials')).toBeInTheDocument();
        expect(screen.getByText('OpenAI')).toBeInTheDocument();
        expect(screen.getByText('Anthropic')).toBeInTheDocument();
        expect(screen.getByText('Google Gemini')).toBeInTheDocument();
        expect(screen.getByText('DeepSeek')).toBeInTheDocument();
    });

    it('should fetch credentials on mount', () => {
        render(<ChatSettings />);
        expect(mockFetchCredentials).toHaveBeenCalledTimes(1);
    });

    it('should show saved credential status', () => {
        mockUseCredentialsStore.mockReturnValue({
            providers: {
                openai: { id: '1', provider: 'openai', label: 'My Key', validated_at: '2024-01-01T00:00:00Z' },
            },
            isLoading: false,
            error: null,
            fetchCredentials: mockFetchCredentials,
            saveCredential: mockSaveCredential,
            deleteCredential: mockDeleteCredential,
            testCredential: mockTestCredential,
            getValidatedProviders: () => ['openai'],
            clearError: mockClearError,
        });

        render(<ChatSettings />);

        expect(screen.getByText('My Key')).toBeInTheDocument();
        expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    it('should allow saving a credential', async () => {
        const user = userEvent.setup();
        mockSaveCredential.mockResolvedValueOnce(undefined);

        render(<ChatSettings />);

        const apiKeyInput = screen.getAllByPlaceholderText('Enter API key')[0];
        await user.type(apiKeyInput, 'sk-test-key-123');

        const saveButton = screen.getAllByText('Save')[0];
        await user.click(saveButton);

        await waitFor(() => {
            expect(mockSaveCredential).toHaveBeenCalledWith('openai', 'sk-test-key-123', undefined);
        });
    });

    it('should allow deleting a credential', async () => {
        const user = userEvent.setup();
        mockDeleteCredential.mockResolvedValueOnce(undefined);
        vi.stubGlobal('confirm', () => true);

        mockUseCredentialsStore.mockReturnValue({
            providers: {
                openai: { id: '1', provider: 'openai', label: 'My Key', validated_at: '2024-01-01T00:00:00Z' },
            },
            isLoading: false,
            error: null,
            fetchCredentials: mockFetchCredentials,
            saveCredential: mockSaveCredential,
            deleteCredential: mockDeleteCredential,
            testCredential: mockTestCredential,
            getValidatedProviders: () => ['openai'],
            clearError: mockClearError,
        });

        render(<ChatSettings />);

        const deleteButtons = screen.getAllByText('Delete');
        await user.click(deleteButtons[0]);

        await waitFor(() => {
            expect(mockDeleteCredential).toHaveBeenCalledWith('openai');
        });
    });

    it('should show error message when save fails', () => {
        mockUseCredentialsStore.mockReturnValue({
            providers: {},
            isLoading: false,
            error: 'Failed to save credential',
            fetchCredentials: mockFetchCredentials,
            saveCredential: mockSaveCredential,
            deleteCredential: mockDeleteCredential,
            testCredential: mockTestCredential,
            getValidatedProviders: () => [],
            clearError: mockClearError,
        });

        render(<ChatSettings />);

        expect(screen.getByText('Failed to save credential')).toBeInTheDocument();
    });

    it('should show loading state', () => {
        mockUseCredentialsStore.mockReturnValue({
            providers: {},
            isLoading: true,
            error: null,
            fetchCredentials: mockFetchCredentials,
            saveCredential: mockSaveCredential,
            deleteCredential: mockDeleteCredential,
            testCredential: mockTestCredential,
            getValidatedProviders: () => [],
            clearError: mockClearError,
        });

        render(<ChatSettings />);

        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
});

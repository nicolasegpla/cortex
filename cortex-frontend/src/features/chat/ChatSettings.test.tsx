import { describe, expect, it, vi, beforeEach } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useCredentialsStore } from './credentialsStore';
import { ChatSettings } from './ChatSettings';
import { useChatStore } from './store';

vi.mock('./credentialsStore', async () => {
    const actual = await vi.importActual('./credentialsStore');
    return {
        ...actual,
        useCredentialsStore: vi.fn(),
    };
});

vi.mock('./store', async () => {
    const actual = await vi.importActual('./store');
    return {
        ...actual,
        useChatStore: vi.fn(),
    };
});

const mockUseCredentialsStore = vi.mocked(useCredentialsStore);
const mockUseChatStore = vi.mocked(useChatStore);

describe('ChatSettings', () => {
    const mockFetchCredentials = vi.fn();
    const mockSaveCredential = vi.fn();
    const mockClearError = vi.fn();
    const mockSetActiveProvider = vi.fn();
    const mockSetActiveModel = vi.fn();

    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
        mockUseChatStore.mockReturnValue({
            setActiveProvider: mockSetActiveProvider,
            setActiveModel: mockSetActiveModel,
        } as unknown as ReturnType<typeof useChatStore>);
        mockUseCredentialsStore.mockReturnValue({
            providers: {},
            isLoading: false,
            error: null,
            fetchCredentials: mockFetchCredentials,
            saveCredential: mockSaveCredential,
            deleteCredential: vi.fn(),
            testCredential: vi.fn(),
            getValidatedProviders: () => [],
            clearError: mockClearError,
        });
    });

    it('should render the provider list without opening the editor by default', () => {
        render(<ChatSettings />);

        expect(screen.getByRole('button', { name: /OpenAI/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Anthropic/i })).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should fetch credentials on mount', () => {
        render(<ChatSettings />);
        expect(mockFetchCredentials).toHaveBeenCalledTimes(1);
    });

    it('should show connected providers summary', () => {
        mockUseCredentialsStore.mockReturnValue({
            providers: {
                openai: { id: '1', provider: 'openai', label: 'My Key', validated_at: '2024-01-01T00:00:00Z' },
            },
            isLoading: false,
            error: null,
            fetchCredentials: mockFetchCredentials,
            saveCredential: mockSaveCredential,
            deleteCredential: vi.fn(),
            testCredential: vi.fn(),
            getValidatedProviders: () => ['openai'],
            clearError: mockClearError,
        });

        render(<ChatSettings />);

        const summaryHeading = screen.getByRole('heading', { name: 'Connected providers' });
        expect(summaryHeading).toBeInTheDocument();

        const summary = summaryHeading.closest('.chat-settings__summary');
        expect(summary).not.toBeNull();
        expect(within(summary as HTMLElement).getByRole('button', { name: 'OpenAI' })).toBeInTheDocument();
    });

    it('should open the provider editor when a catalog item is selected', async () => {
        const user = userEvent.setup();

        render(<ChatSettings />);

        await user.click(screen.getByRole('button', { name: /Anthropic/i }));

        const dialog = screen.getByRole('dialog', { name: 'Anthropic' });
        expect(within(dialog).getByLabelText('API key')).toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('should allow saving a credential', async () => {
        const user = userEvent.setup();
        mockSaveCredential.mockResolvedValueOnce(undefined);

        render(<ChatSettings />);

        await user.click(screen.getByRole('button', { name: /OpenAI/i }));

        const dialog = screen.getByRole('dialog', { name: 'OpenAI' });
        const apiKeyInput = within(dialog).getByLabelText('API key');
        await user.type(apiKeyInput, 'sk-test-key-123');

        const saveButton = within(dialog).getByRole('button', { name: 'Save' });
        await user.click(saveButton);

        await waitFor(() => {
            expect(mockSaveCredential).toHaveBeenCalledWith('openai', 'sk-test-key-123');
        });
        expect(mockSetActiveProvider).toHaveBeenCalledWith('openai');
        expect(mockSetActiveModel).toHaveBeenCalledWith('gpt-4o');
    });

    it('should show error message when save fails', () => {
        mockUseCredentialsStore.mockReturnValue({
            providers: {},
            isLoading: false,
            error: 'Failed to save credential',
            fetchCredentials: mockFetchCredentials,
            saveCredential: mockSaveCredential,
            deleteCredential: vi.fn(),
            testCredential: vi.fn(),
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
            deleteCredential: vi.fn(),
            testCredential: vi.fn(),
            getValidatedProviders: () => [],
            clearError: mockClearError,
        });

        render(<ChatSettings />);

        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
});

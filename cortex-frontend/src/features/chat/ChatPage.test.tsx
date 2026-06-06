import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useChatStore } from './store';
import { useCredentialsStore } from './credentialsStore';
import { ChatPage } from './ChatPage';

vi.mock('./store', async () => {
    const actual = await vi.importActual('./store');
    return {
        ...actual,
        useChatStore: vi.fn(),
    };
});

vi.mock('./credentialsStore', async () => {
    const actual = await vi.importActual('./credentialsStore');
    return {
        ...actual,
        useCredentialsStore: vi.fn(),
    };
});

const mockUseChatStore = vi.mocked(useChatStore);
const mockUseCredentialsStore = vi.mocked(useCredentialsStore);

describe('ChatPage', () => {
    const mockSendMessage = vi.fn();
    const mockAbort = vi.fn();
    const mockClearMessages = vi.fn();
    const mockSetActiveProvider = vi.fn();
    const mockSetActiveModel = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseChatStore.mockReturnValue({
            messages: [],
            isLoading: false,
            error: null,
            activeProvider: 'openai',
            activeModel: 'gpt-4o',
            sendMessage: mockSendMessage,
            abort: mockAbort,
            clearMessages: mockClearMessages,
            setActiveProvider: mockSetActiveProvider,
            setActiveModel: mockSetActiveModel,
            clearError: vi.fn(),
            _abortController: null,
        });
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

    it('should render chat interface', () => {
        render(<ChatPage />);

        expect(screen.getByText('Chat')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
        expect(screen.getByText('Send')).toBeInTheDocument();
    });

    it('should display messages', () => {
        mockUseChatStore.mockReturnValue({
            messages: [
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi there!' },
            ],
            isLoading: false,
            error: null,
            activeProvider: 'openai',
            activeModel: 'gpt-4o',
            sendMessage: mockSendMessage,
            abort: mockAbort,
            clearMessages: mockClearMessages,
            setActiveProvider: mockSetActiveProvider,
            setActiveModel: mockSetActiveModel,
            clearError: vi.fn(),
            _abortController: null,
        });

        render(<ChatPage />);

        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });

    it('should send message on submit', async () => {
        const user = userEvent.setup();
        mockSendMessage.mockResolvedValueOnce(undefined);

        mockUseCredentialsStore.mockReturnValue({
            providers: {
                openai: { id: '1', provider: 'openai', label: 'Key', validated_at: '2024-01-01T00:00:00Z' },
            },
            isLoading: false,
            error: null,
            fetchCredentials: vi.fn(),
            saveCredential: vi.fn(),
            deleteCredential: vi.fn(),
            testCredential: vi.fn(),
            getValidatedProviders: () => ['openai'],
            clearError: vi.fn(),
        });

        render(<ChatPage />);

        const inputs = screen.getAllByPlaceholderText('Type a message...');
        await user.type(inputs[0], 'Test message');

        const sendButtons = screen.getAllByText('Send');
        await user.click(sendButtons[0]);

        await waitFor(() => {
            expect(mockSendMessage).toHaveBeenCalledWith('Test message');
        });
    });

    it('should show loading state', () => {
        mockUseChatStore.mockReturnValue({
            messages: [],
            isLoading: true,
            error: null,
            activeProvider: 'openai',
            activeModel: 'gpt-4o',
            sendMessage: mockSendMessage,
            abort: mockAbort,
            clearMessages: mockClearMessages,
            setActiveProvider: mockSetActiveProvider,
            setActiveModel: mockSetActiveModel,
            clearError: vi.fn(),
            _abortController: null,
        });

        render(<ChatPage />);

        expect(screen.getByText('Stop')).toBeInTheDocument();
    });

    it('should call abort on stop button', async () => {
        const user = userEvent.setup();
        mockUseChatStore.mockReturnValue({
            messages: [],
            isLoading: true,
            error: null,
            activeProvider: 'openai',
            activeModel: 'gpt-4o',
            sendMessage: mockSendMessage,
            abort: mockAbort,
            clearMessages: mockClearMessages,
            setActiveProvider: mockSetActiveProvider,
            setActiveModel: mockSetActiveModel,
            clearError: vi.fn(),
            _abortController: null,
        });

        render(<ChatPage />);

        const stopButtons = screen.getAllByText('Stop');
        await user.click(stopButtons[0]);

        expect(mockAbort).toHaveBeenCalled();
    });

    it('should show error message', () => {
        mockUseChatStore.mockReturnValue({
            messages: [],
            isLoading: false,
            error: 'Something went wrong',
            activeProvider: 'openai',
            activeModel: 'gpt-4o',
            sendMessage: mockSendMessage,
            abort: mockAbort,
            clearMessages: mockClearMessages,
            setActiveProvider: mockSetActiveProvider,
            setActiveModel: mockSetActiveModel,
            clearError: vi.fn(),
            _abortController: null,
        });

        render(<ChatPage />);

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should show provider selector with validated providers', () => {
        mockUseChatStore.mockReturnValue({
            messages: [],
            isLoading: false,
            error: null,
            activeProvider: 'openai',
            activeModel: 'gpt-4o',
            sendMessage: mockSendMessage,
            abort: mockAbort,
            clearMessages: mockClearMessages,
            setActiveProvider: mockSetActiveProvider,
            setActiveModel: mockSetActiveModel,
            clearError: vi.fn(),
            _abortController: null,
        });
        mockUseCredentialsStore.mockReturnValue({
            providers: {
                openai: { id: '1', provider: 'openai', label: 'Key', validated_at: '2024-01-01T00:00:00Z' },
                anthropic: { id: '2', provider: 'anthropic', label: 'Key', validated_at: null },
            },
            isLoading: false,
            error: null,
            fetchCredentials: vi.fn(),
            saveCredential: vi.fn(),
            deleteCredential: vi.fn(),
            testCredential: vi.fn(),
            getValidatedProviders: () => ['openai'],
            clearError: vi.fn(),
        });

        render(<ChatPage />);

        expect(screen.getAllByText('Provider:')[0]).toBeInTheDocument();
        expect(screen.getAllByRole('combobox')[0]).toBeInTheDocument();
    });

    it('should switch to first validated provider when active provider is unavailable', () => {
        mockUseCredentialsStore.mockReturnValue({
            providers: {
                gemini: { id: '1', provider: 'gemini', label: 'cortex', validated_at: '2024-01-01T00:00:00Z' },
            },
            isLoading: false,
            error: null,
            fetchCredentials: vi.fn(),
            saveCredential: vi.fn(),
            deleteCredential: vi.fn(),
            testCredential: vi.fn(),
            getValidatedProviders: () => ['gemini'],
            clearError: vi.fn(),
        });

        render(<ChatPage />);

        expect(mockSetActiveProvider).toHaveBeenCalledWith('gemini');
    });
});

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

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

function renderChatPage() {
    return render(
        <MemoryRouter>
            <ChatPage />
        </MemoryRouter>
    );
}

describe('ChatPage', () => {
    const mockSendMessage = vi.fn();
    const mockAbort = vi.fn();
    const mockClearMessages = vi.fn();
    const mockSetActiveModel = vi.fn();

    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
        mockUseChatStore.mockReturnValue({
            messages: [],
            isLoading: false,
            error: null,
            activeProvider: 'openai',
            activeModel: 'gpt-4o',
            hydrated: true,
            sendMessage: mockSendMessage,
            abort: mockAbort,
            clearMessages: mockClearMessages,
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
        renderChatPage();

        expect(screen.getByText('¿En qué te puedo ayudar?')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Configurá un proveedor en Configuración para empezar a chatear')).toBeInTheDocument();
        expect(screen.getByLabelText('Enviar mensaje')).toBeInTheDocument();
    });

    it('should fetch credentials on mount', () => {
        const fetchCredentials = vi.fn();

        mockUseCredentialsStore.mockReturnValue({
            providers: {},
            isLoading: false,
            error: null,
            fetchCredentials,
            saveCredential: vi.fn(),
            deleteCredential: vi.fn(),
            testCredential: vi.fn(),
            getValidatedProviders: () => [],
            clearError: vi.fn(),
        });

        renderChatPage();

        expect(fetchCredentials).toHaveBeenCalled();
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
            hydrated: true,
            sendMessage: mockSendMessage,
            abort: mockAbort,
            clearMessages: mockClearMessages,
            setActiveModel: mockSetActiveModel,
            clearError: vi.fn(),
            _abortController: null,
        });

        renderChatPage();

        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });

    it('should render markdown content in messages', () => {
        mockUseChatStore.mockReturnValue({
            messages: [
                { role: 'user', content: 'Show me **bold** text' },
                { role: 'assistant', content: 'Here is **bold** and *italic* text' },
            ],
            isLoading: false,
            error: null,
            activeProvider: 'openai',
            activeModel: 'gpt-4o',
            hydrated: true,
            sendMessage: mockSendMessage,
            abort: mockAbort,
            clearMessages: mockClearMessages,
            setActiveModel: mockSetActiveModel,
            clearError: vi.fn(),
            _abortController: null,
        });

        renderChatPage();

        const boldElements = screen.getAllByText('bold');
        expect(boldElements.length).toBeGreaterThanOrEqual(1);
        expect(boldElements[0].tagName).toBe('STRONG');

        expect(screen.getByText('italic')).toBeInTheDocument();
    });

    it('should render markdown tables in messages', () => {
        const tableMarkdown = `| Name | Value |
|------|-------|
| A    | 1     |
| B    | 2     |`;

        mockUseChatStore.mockReturnValue({
            messages: [
                { role: 'assistant', content: tableMarkdown },
            ],
            isLoading: false,
            error: null,
            activeProvider: 'openai',
            activeModel: 'gpt-4o',
            hydrated: true,
            sendMessage: mockSendMessage,
            abort: mockAbort,
            clearMessages: mockClearMessages,
            setActiveModel: mockSetActiveModel,
            clearError: vi.fn(),
            _abortController: null,
        });

        renderChatPage();

        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Value')).toBeInTheDocument();
        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
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

        renderChatPage();

        const inputs = screen.getAllByPlaceholderText('Asigná una tarea o preguntá lo que necesites');
        await user.type(inputs[0], 'Test message');

        const sendButtons = screen.getAllByLabelText('Enviar mensaje');
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
            hydrated: true,
            sendMessage: mockSendMessage,
            abort: mockAbort,
            clearMessages: mockClearMessages,
            setActiveModel: mockSetActiveModel,
            clearError: vi.fn(),
            _abortController: null,
        });

        renderChatPage();

        expect(screen.getByLabelText('Detener generación')).toBeInTheDocument();
    });

    it('should call abort on stop button', async () => {
        const user = userEvent.setup();
        mockUseChatStore.mockReturnValue({
            messages: [],
            isLoading: true,
            error: null,
            activeProvider: 'openai',
            activeModel: 'gpt-4o',
            hydrated: true,
            sendMessage: mockSendMessage,
            abort: mockAbort,
            clearMessages: mockClearMessages,
            setActiveModel: mockSetActiveModel,
            clearError: vi.fn(),
            _abortController: null,
        });

        renderChatPage();

        const stopButtons = screen.getAllByLabelText('Detener generación');
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
            hydrated: true,
            sendMessage: mockSendMessage,
            abort: mockAbort,
            clearMessages: mockClearMessages,
            setActiveModel: mockSetActiveModel,
            clearError: vi.fn(),
            _abortController: null,
        });

        renderChatPage();

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should render ModelSelector badge with active model in input bar', () => {
        mockUseChatStore.mockReturnValue({
            messages: [],
            isLoading: false,
            error: null,
            activeProvider: 'openai',
            activeModel: 'gpt-4o',
            hydrated: true,
            sendMessage: mockSendMessage,
            abort: mockAbort,
            clearMessages: mockClearMessages,
            setActiveModel: mockSetActiveModel,
            clearError: vi.fn(),
            _abortController: null,
        });
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

        renderChatPage();

        expect(screen.getByRole('button', { name: /GPT-4o/i })).toBeInTheDocument();
        expect(screen.queryByLabelText('Seleccionar proveedor')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Seleccionar modelo')).not.toBeInTheDocument();
    });

    it('should switch to the first validated provider default model when active provider is unavailable', () => {
        mockUseChatStore.mockReturnValue({
            messages: [],
            isLoading: false,
            error: null,
            activeProvider: 'openai',
            activeModel: 'gpt-4o',
            hydrated: true,
            sendMessage: mockSendMessage,
            abort: mockAbort,
            clearMessages: mockClearMessages,
            setActiveModel: mockSetActiveModel,
            clearError: vi.fn(),
            _abortController: null,
        });
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

        renderChatPage();

        expect(mockSetActiveModel).toHaveBeenCalledWith('gemini-2.0-flash');
    });

    it('should not switch model before chat store hydration completes', () => {
        mockUseChatStore.mockReturnValue({
            messages: [],
            isLoading: false,
            error: null,
            activeProvider: 'openai',
            activeModel: 'gpt-4o',
            hydrated: false,
            sendMessage: mockSendMessage,
            abort: mockAbort,
            clearMessages: mockClearMessages,
            setActiveModel: mockSetActiveModel,
            clearError: vi.fn(),
            _abortController: null,
        });
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

        renderChatPage();

        expect(mockSetActiveModel).not.toHaveBeenCalled();
    });

    it('should call setActiveModel when selecting a model from the badge popover', async () => {
        const user = userEvent.setup();

        mockUseChatStore.mockReturnValue({
            messages: [],
            isLoading: false,
            error: null,
            activeProvider: 'openai',
            activeModel: 'gpt-4o',
            hydrated: true,
            sendMessage: mockSendMessage,
            abort: mockAbort,
            clearMessages: mockClearMessages,
            setActiveModel: mockSetActiveModel,
            clearError: vi.fn(),
            _abortController: null,
        });
        mockUseCredentialsStore.mockReturnValue({
            providers: {
                openai: { id: '1', provider: 'openai', label: 'Key', validated_at: '2024-01-01T00:00:00Z' },
                deepseek: { id: '2', provider: 'deepseek', label: 'Key', validated_at: '2024-01-01T00:00:00Z' },
            },
            isLoading: false,
            error: null,
            fetchCredentials: vi.fn(),
            saveCredential: vi.fn(),
            deleteCredential: vi.fn(),
            testCredential: vi.fn(),
            getValidatedProviders: () => ['openai', 'deepseek'],
            clearError: vi.fn(),
        });

        renderChatPage();

        await user.click(screen.getByRole('button', { name: /GPT-4o/i }));
        const option = screen.getByRole('menuitemradio', { name: /DeepSeek V4 Flash/i });
        await user.click(option);

        await waitFor(() => {
            expect(mockSetActiveModel).toHaveBeenCalledWith('deepseek-v4-flash');
        });
    });

    it('should direct users to config when no credentials are available', () => {
        renderChatPage();

        expect(screen.getByText('Configurá un proveedor desde Configuración antes de iniciar una conversación.')).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /open config/i })).not.toBeInTheDocument();
    });
});

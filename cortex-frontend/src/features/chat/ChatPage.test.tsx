import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { useChatStore } from './store';
import { ChatPage } from './ChatPage';

vi.mock('./store', async () => {
    const actual = await vi.importActual('./store');
    return {
        ...actual,
        useChatStore: vi.fn(),
    };
});

const mockUseChatStore = vi.mocked(useChatStore);

function renderChatPage() {
    return render(
        <MemoryRouter>
            <ChatPage />
        </MemoryRouter>
    );
}

function createMockState(overrides: Partial<ReturnType<typeof useChatStore>> = {}) {
    return {
        messages: [],
        isLoading: false,
        error: null,
        sendMessage: vi.fn(),
        clearMessages: vi.fn(),
        clearError: vi.fn(),
        ...overrides,
    };
}

describe('ChatPage', () => {
    const mockSendMessage = vi.fn();
    const mockClearMessages = vi.fn();

    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
        mockUseChatStore.mockReturnValue(createMockState({
            sendMessage: mockSendMessage,
            clearMessages: mockClearMessages,
        }));
    });

    it('should render chat interface', () => {
        renderChatPage();

        expect(screen.getByText('¿En qué te puedo ayudar?')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Asigná una tarea o preguntá lo que necesites')).toBeInTheDocument();
        expect(screen.getByLabelText('Enviar mensaje')).toBeInTheDocument();
    });

    it('should not expose legacy streaming controls or model selector', () => {
        renderChatPage();

        expect(screen.queryByLabelText('Detener generación')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /GPT-4o/i })).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Seleccionar proveedor')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Seleccionar modelo')).not.toBeInTheDocument();
    });

    it('should display messages', () => {
        mockUseChatStore.mockReturnValue(createMockState({
            messages: [
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi there!' },
            ],
        }));

        renderChatPage();

        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });

    it('should render markdown content in messages', () => {
        mockUseChatStore.mockReturnValue(createMockState({
            messages: [
                { role: 'user', content: 'Show me **bold** text' },
                { role: 'assistant', content: 'Here is **bold** and *italic* text' },
            ],
        }));

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

        mockUseChatStore.mockReturnValue(createMockState({
            messages: [{ role: 'assistant', content: tableMarkdown }],
        }));

        renderChatPage();

        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Value')).toBeInTheDocument();
        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should send message on submit', async () => {
        const user = userEvent.setup();
        mockSendMessage.mockResolvedValueOnce(undefined);

        renderChatPage();

        const input = screen.getByPlaceholderText('Asigná una tarea o preguntá lo que necesites');
        await user.type(input, 'Test message');

        const sendButton = screen.getByLabelText('Enviar mensaje');
        await user.click(sendButton);

        await waitFor(() => {
            expect(mockSendMessage).toHaveBeenCalledWith('Test message');
        });
    });

    it('should disable send button while loading', () => {
        mockUseChatStore.mockReturnValue(createMockState({ isLoading: true }));

        renderChatPage();

        const sendButton = screen.getByLabelText('Enviar mensaje');
        expect(sendButton).toBeDisabled();
        expect(sendButton).toHaveAttribute('aria-busy', 'true');
    });

    it('should show error message', () => {
        mockUseChatStore.mockReturnValue(createMockState({ error: 'Something went wrong' }));

        renderChatPage();

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should clear messages when clear button is clicked', async () => {
        const user = userEvent.setup();
        mockUseChatStore.mockReturnValue(createMockState({
            messages: [{ role: 'user', content: 'Hello' }],
            clearMessages: mockClearMessages,
        }));

        renderChatPage();

        const clearButton = screen.getByLabelText('Limpiar conversación');
        await user.click(clearButton);

        expect(mockClearMessages).toHaveBeenCalled();
    });

    it('should constrain input box width with the expected layout classes', () => {
        const { container } = renderChatPage();
        const inputBox = container.querySelector('.chat-page__input-box');
        const inputArea = container.querySelector('.chat-page__input-area');
        expect(inputArea).toHaveClass('chat-page__input-area');
        expect(inputBox).toHaveClass('chat-page__input-box');
    });
});

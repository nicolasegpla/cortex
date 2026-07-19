import { describe, expect, it, vi, beforeEach } from 'vitest';

import { apiClient } from '@/services/api/client';
import { useChatStore } from './store';

vi.mock('@/services/api/client', async () => {
    const actual = await vi.importActual('@/services/api/client');
    return {
        ...actual,
        apiClient: {
            get: vi.fn(),
            post: vi.fn(),
            delete: vi.fn(),
            stream: vi.fn(),
        },
    };
});

describe('useChatStore', () => {
    beforeEach(() => {
        localStorage.clear();
        useChatStore.setState({
            messages: [],
            isLoading: false,
            error: null,
        });
        vi.clearAllMocks();
    });

    it('should initialize with default state', () => {
        const state = useChatStore.getState();

        expect(state.messages).toEqual([]);
        expect(state.isLoading).toBe(false);
        expect(state.error).toBeNull();
    });

    it('should not expose abort or abort-controller state for the n8n path', () => {
        const state = useChatStore.getState();

        expect('abort' in state).toBe(false);
        expect('_abortController' in state).toBe(false);
    });

    it('should not expose provider/model state or actions', () => {
        const state = useChatStore.getState();

        expect('activeProvider' in state).toBe(false);
        expect('activeModel' in state).toBe(false);
        expect('hydrated' in state).toBe(false);
        expect('setActiveModel' in state).toBe(false);
        expect('hydrate' in state).toBe(false);
    });

    describe('sendMessage', () => {
        it('should append user message and single assistant answer', async () => {
            vi.mocked(apiClient.post).mockResolvedValueOnce({ answer: 'Hello from n8n' });

            const { sendMessage } = useChatStore.getState();
            await sendMessage('Hi there');

            const state = useChatStore.getState();
            expect(state.messages).toHaveLength(2);
            expect(state.messages[0]).toEqual({ role: 'user', content: 'Hi there' });
            expect(state.messages[1]).toEqual({ role: 'assistant', content: 'Hello from n8n' });
            expect(state.isLoading).toBe(false);
            expect(apiClient.post).toHaveBeenCalledWith('/chat/n8n', {
                message: 'Hi there',
            });
        });

        it('should set loading state during send', async () => {
            vi.mocked(apiClient.post).mockImplementation(
                () => new Promise((resolve) =>
                    setTimeout(() => resolve({ answer: 'ok' }), 10)
                )
            );

            const { sendMessage } = useChatStore.getState();
            const promise = sendMessage('Hello');

            expect(useChatStore.getState().isLoading).toBe(true);

            await promise;
            expect(useChatStore.getState().isLoading).toBe(false);
        });

        it('should trim whitespace before sending', async () => {
            vi.mocked(apiClient.post).mockResolvedValueOnce({ answer: 'answer' });

            const { sendMessage } = useChatStore.getState();
            await sendMessage('   hello   ');

            expect(apiClient.post).toHaveBeenCalledWith('/chat/n8n', {
                message: 'hello',
            });
        });

        it('should handle API error', async () => {
            vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('n8n unavailable'));

            const { sendMessage } = useChatStore.getState();
            await sendMessage('test');

            const state = useChatStore.getState();
            expect(state.messages).toHaveLength(2);
            expect(state.messages[1]).toEqual({ role: 'assistant', content: '' });
            expect(state.error).toBe('n8n unavailable');
            expect(state.isLoading).toBe(false);
        });

        it('should not send empty messages', async () => {
            const { sendMessage } = useChatStore.getState();
            await sendMessage('   ');

            expect(apiClient.post).not.toHaveBeenCalled();
            expect(useChatStore.getState().messages).toHaveLength(0);
        });
    });

    describe('clearMessages', () => {
        it('should clear all messages', () => {
            useChatStore.setState({
                messages: [
                    { role: 'user', content: 'Hello' },
                    { role: 'assistant', content: 'Hi' },
                ],
            });

            const { clearMessages } = useChatStore.getState();
            clearMessages();

            expect(useChatStore.getState().messages).toEqual([]);
        });
    });

    describe('legacy persistence', () => {
        it('should rehydrate ignoring legacy model/provider fields without wiping storage', async () => {
            localStorage.setItem(
                'cortex-chat-preferences',
                JSON.stringify({
                    state: { activeModel: 'gpt-4o', activeProvider: 'openai' },
                    version: 0,
                })
            );

            await useChatStore.persist.rehydrate();

            const state = useChatStore.getState();
            expect(state.messages).toEqual([]);
            expect(state.isLoading).toBe(false);
            expect(state.error).toBeNull();
            expect('activeModel' in state).toBe(false);
            expect('activeProvider' in state).toBe(false);
            expect(localStorage.getItem('cortex-chat-preferences')).not.toBeNull();
        });
    });
});

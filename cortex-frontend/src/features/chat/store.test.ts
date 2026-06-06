import { describe, expect, it, vi, beforeEach } from 'vitest';

import { apiClient } from '@/services/api/client';
import { useChatStore, PROVIDER_MODELS } from './store';

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

function createMockStream(chunks: string[]): ReadableStream <Uint8Array> {
    return new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();
            for (const chunk of chunks) {
                controller.enqueue(encoder.encode(chunk));
            }
            controller.close();
        },
    });
}

describe('useChatStore', () => {
    beforeEach(() => {
        useChatStore.setState({
            messages: [],
            isLoading: false,
            error: null,
            activeProvider: 'openai',
            activeModel: 'gpt-4o',
        });
        vi.clearAllMocks();
    });

    it('should initialize with default state', () => {
        const state = useChatStore.getState();

        expect(state.messages).toEqual([]);
        expect(state.isLoading).toBe(false);
        expect(state.error).toBeNull();
        expect(state.activeProvider).toBe('openai');
        expect(state.activeModel).toBe('gpt-4o');
    });

    describe('sendMessage', () => {
        it('should append user message and stream assistant response', async () => {
            const sseChunks = [
                'event: delta\ndata: Hello\n\n',
                'event: delta\ndata: world\n\n',
                'event: done\ndata: \n\n',
            ];

            vi.mocked(apiClient.stream).mockResolvedValueOnce(createMockStream(sseChunks));

            const { sendMessage } = useChatStore.getState();
            await sendMessage('Hi there');

            const state = useChatStore.getState();
            expect(state.messages).toHaveLength(2);
            expect(state.messages[0]).toEqual({ role: 'user', content: 'Hi there' });
            expect(state.messages[1]).toEqual({ role: 'assistant', content: 'Helloworld' });
            expect(state.isLoading).toBe(false);
        });

        it('should handle streaming error event', async () => {
            const sseChunks = [
                'event: delta\ndata: Partial\n\n',
                'event: error\ndata: Provider failed\n\n',
            ];

            vi.mocked(apiClient.stream).mockResolvedValueOnce(createMockStream(sseChunks));

            const { sendMessage } = useChatStore.getState();
            await sendMessage('test');

            const state = useChatStore.getState();
            expect(state.messages).toHaveLength(2);
            expect(state.messages[1].content).toBe('Partial');
            expect(state.error).toBe('Provider failed');
            expect(state.isLoading).toBe(false);
        });

        it('should set loading state during send', async () => {
            vi.mocked(apiClient.stream).mockImplementation(
                () => new Promise((resolve) =>
                    setTimeout(() => resolve(createMockStream(['event: done\ndata: \n\n'])), 10)
                )
            );

            const { sendMessage } = useChatStore.getState();
            const promise = sendMessage('Hello');

            expect(useChatStore.getState().isLoading).toBe(true);

            await promise;
            expect(useChatStore.getState().isLoading).toBe(false);
        });

        it('should handle network error', async () => {
            vi.mocked(apiClient.stream).mockRejectedValueOnce(new Error('Connection lost'));

            const { sendMessage } = useChatStore.getState();
            await sendMessage('test');

            const state = useChatStore.getState();
            expect(state.messages).toHaveLength(2);
            expect(state.messages[0]).toEqual({ role: 'user', content: 'test' });
            expect(state.messages[1]).toEqual({ role: 'assistant', content: '' });
            expect(state.error).toBe('Connection lost');
            expect(state.isLoading).toBe(false);
        });

        it('should not send empty messages', async () => {
            const { sendMessage } = useChatStore.getState();
            await sendMessage('   ');

            expect(apiClient.stream).not.toHaveBeenCalled();
            expect(useChatStore.getState().messages).toHaveLength(0);
        });
    });

    describe('abort', () => {
        it('should abort streaming and stop loading', async () => {
            const controller = new AbortController();
            
            vi.mocked(apiClient.stream).mockImplementation(() => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(createMockStream(['event: done\ndata: \n\n']));
                    }, 100);
                });
            });

            const { sendMessage, abort } = useChatStore.getState();
            const promise = sendMessage('Long message');

            // Abort while loading
            expect(useChatStore.getState().isLoading).toBe(true);
            abort();

            await promise;

            const state = useChatStore.getState();
            expect(state.isLoading).toBe(false);
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

    describe('setActiveProvider', () => {
        it('should update active provider', () => {
            const { setActiveProvider } = useChatStore.getState();
            setActiveProvider('anthropic');

            expect(useChatStore.getState().activeProvider).toBe('anthropic');
        });

        it('should support gemini as active provider', () => {
            const { setActiveProvider } = useChatStore.getState();
            setActiveProvider('gemini');

            expect(useChatStore.getState().activeProvider).toBe('gemini');
        });

        it('should support deepseek as active provider', () => {
            const { setActiveProvider } = useChatStore.getState();
            setActiveProvider('deepseek');

            expect(useChatStore.getState().activeProvider).toBe('deepseek');
        });
    });

    describe('setActiveProvider', () => {
        it('should update active provider', () => {
            const { setActiveProvider } = useChatStore.getState();
            setActiveProvider('anthropic');

            expect(useChatStore.getState().activeProvider).toBe('anthropic');
        });

        it('should reset active model to provider default when provider changes', () => {
            const { setActiveProvider } = useChatStore.getState();
            setActiveProvider('deepseek');

            expect(useChatStore.getState().activeProvider).toBe('deepseek');
            expect(useChatStore.getState().activeModel).toBe('deepseek-v4-flash');
        });

        it('should support gemini as active provider', () => {
            const { setActiveProvider } = useChatStore.getState();
            setActiveProvider('gemini');

            expect(useChatStore.getState().activeProvider).toBe('gemini');
            expect(useChatStore.getState().activeModel).toBe('gemini-2.0-flash');
        });

        it('should support deepseek as active provider', () => {
            const { setActiveProvider } = useChatStore.getState();
            setActiveProvider('deepseek');

            expect(useChatStore.getState().activeProvider).toBe('deepseek');
            expect(useChatStore.getState().activeModel).toBe('deepseek-v4-flash');
        });
    });

    describe('setActiveModel', () => {
        it('should update active model', () => {
            const { setActiveModel } = useChatStore.getState();
            setActiveModel('deepseek-v4-pro');

            expect(useChatStore.getState().activeModel).toBe('deepseek-v4-pro');
        });
    });

    describe('PROVIDER_MODELS', () => {
        it('should include all 4 deepseek models', () => {
            const deepseekModels = PROVIDER_MODELS.deepseek.map((m) => m.id);
            expect(deepseekModels).toContain('deepseek-v4-flash');
            expect(deepseekModels).toContain('deepseek-v4-pro');
            expect(deepseekModels).toContain('deepseek-chat');
            expect(deepseekModels).toContain('deepseek-reasoner');
        });

        it('should mark v4-flash and v4-pro as preferred', () => {
            const flash = PROVIDER_MODELS.deepseek.find((m) => m.id === 'deepseek-v4-flash');
            const pro = PROVIDER_MODELS.deepseek.find((m) => m.id === 'deepseek-v4-pro');
            expect(flash?.preferred).toBe(true);
            expect(pro?.preferred).toBe(true);
        });

        it('should not mark legacy models as preferred', () => {
            const chat = PROVIDER_MODELS.deepseek.find((m) => m.id === 'deepseek-chat');
            const reasoner = PROVIDER_MODELS.deepseek.find((m) => m.id === 'deepseek-reasoner');
            expect(chat?.preferred).toBeUndefined();
            expect(reasoner?.preferred).toBeUndefined();
        });
    });
});

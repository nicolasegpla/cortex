import { describe, expect, it, vi, beforeEach } from 'vitest';

import { HermesError, streamChat } from '@/services/hermes/client';
import { useChatStore, PROVIDER_MODELS, MODEL_PROVIDER_MAP } from './store';

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
            activeProvider: 'openai',
            activeModel: 'gpt-4o',
            hydrated: false,
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

    it('should not expose abort or abort-controller state for the n8n path', () => {
        const state = useChatStore.getState();

        expect('abort' in state).toBe(false);
        expect('_abortController' in state).toBe(false);
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

    describe('setActiveModel', () => {
        it('should update active model', () => {
            const { setActiveModel } = useChatStore.getState();
            setActiveModel('deepseek-v4-pro');

            expect(useChatStore.getState().activeModel).toBe('deepseek-v4-pro');
        });

        it('should derive active provider from selected model', () => {
            const { setActiveModel } = useChatStore.getState();
            setActiveModel('claude-3-5-sonnet-20241022');

            expect(useChatStore.getState().activeProvider).toBe('anthropic');
            expect(useChatStore.getState().activeModel).toBe('claude-3-5-sonnet-20241022');
        });

        it('should derive deepseek provider from deepseek model', () => {
            const { setActiveModel } = useChatStore.getState();
            setActiveModel('deepseek-chat');

            expect(useChatStore.getState().activeProvider).toBe('deepseek');
            expect(useChatStore.getState().activeModel).toBe('deepseek-chat');
        });

        it('should persist only the active model selection to localStorage', async () => {
            const { setActiveModel } = useChatStore.getState();

            setActiveModel('deepseek-v4-pro');

            await new Promise((resolve) => setTimeout(resolve, 10));

            const saved = JSON.parse(localStorage.getItem('cortex-chat-preferences') || '{}');
            expect(saved.state.activeModel).toBe('deepseek-v4-pro');
            expect(saved.state).not.toHaveProperty('activeProvider');
        });
    });

    describe('hydrate', () => {
        it('should mark the store as hydrated and keep a valid selection', () => {
            const { hydrate } = useChatStore.getState();

            hydrate('deepseek-v4-pro');

            expect(useChatStore.getState().hydrated).toBe(true);
            expect(useChatStore.getState().activeProvider).toBe('deepseek');
            expect(useChatStore.getState().activeModel).toBe('deepseek-v4-pro');
        });

        it('should sanitize an invalid persisted model during hydration', () => {
            const { hydrate } = useChatStore.getState();

            hydrate('nonexistent-model');

            expect(useChatStore.getState().hydrated).toBe(true);
            expect(useChatStore.getState().activeProvider).toBe('openai');
            expect(useChatStore.getState().activeModel).toBe('gpt-4o');
        });

        it('should fall back to the default provider/model for an unknown persisted model', () => {
            const { hydrate } = useChatStore.getState();

            hydrate('unknown-model');

            expect(useChatStore.getState().hydrated).toBe(true);
            expect(useChatStore.getState().activeProvider).toBe('openai');
            expect(useChatStore.getState().activeModel).toBe('gpt-4o');
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

    describe('MODEL_PROVIDER_MAP', () => {
        it('should map every model id to its provider', () => {
            for (const [provider, models] of Object.entries(PROVIDER_MODELS)) {
                for (const model of models) {
                    expect(MODEL_PROVIDER_MAP[model.id]).toBe(provider);
                }
            }
        });

        it('should derive openai provider for gpt models', () => {
            expect(MODEL_PROVIDER_MAP['gpt-4o']).toBe('openai');
            expect(MODEL_PROVIDER_MAP['gpt-4o-mini']).toBe('openai');
        });

        it('should derive gemini provider for gemini models', () => {
            expect(MODEL_PROVIDER_MAP['gemini-2.0-flash']).toBe('gemini');
            expect(MODEL_PROVIDER_MAP['gemini-1.5-pro']).toBe('gemini');
        });
    });
});

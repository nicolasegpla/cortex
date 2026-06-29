import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { apiClient } from '@/services/api/client';

import type { Provider } from './credentialsStore';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface ModelOption {
    id: string;
    name: string;
    preferred?: boolean;
}

export const PROVIDER_MODELS: Record<Provider, ModelOption[]> = {
    openai: [
        { id: 'gpt-4o', name: 'GPT-4o' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    ],
    anthropic: [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    ],
    gemini: [
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    ],
    deepseek: [
        { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', preferred: true },
        { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', preferred: true },
        { id: 'deepseek-chat', name: 'DeepSeek Chat (Legacy)' },
        { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (Legacy)' },
    ],
};

export const DEFAULT_MODELS: Record<Provider, string> = {
    openai: 'gpt-4o',
    anthropic: 'claude-3-5-sonnet-20241022',
    gemini: 'gemini-2.0-flash',
    deepseek: 'deepseek-v4-flash',
};

export const MODEL_PROVIDER_MAP: Record<string, Provider> = Object.entries(
    PROVIDER_MODELS
).reduce<Record<string, Provider>>((map, [provider, models]) => {
    for (const model of models) {
        if (!map[model.id]) {
            map[model.id] = provider as Provider;
        }
    }
    return map;
}, {});

interface ChatState {
    messages: ChatMessage[];
    isLoading: boolean;
    error: string | null;
    activeProvider: Provider;
    activeModel: string;
    hydrated: boolean;

    sendMessage: (text: string) => Promise<void>;
    clearMessages: () => void;
    setActiveModel: (model: string) => void;
    hydrate: (model: string) => void;
    clearError: () => void;
}

async function* readSSEChunks(stream: ReadableStream<Uint8Array>): AsyncGenerator<{ event: string; data: string }> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';
    let currentData = '';
    let pendingEvent: { event: string; data: string } | null = null;

    const processLine = (line: string): void => {
        if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
        } else if (line.startsWith('data: ')) {
            currentData += `${currentData ? '\n' : ''}${line.slice(6)}`;
        } else if (line === '') {
            if (currentEvent) {
                pendingEvent = { event: currentEvent, data: currentData };
                currentEvent = '';
                currentData = '';
            }
        }
    };

    const flushBuffer = (): void => {
        if (!buffer.trim()) return;

        const lines = buffer.split('\n');
        for (const rawLine of lines) {
            const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
            processLine(line);
        }
        buffer = '';
    };

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const rawLine of lines) {
                const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
                processLine(line);
                if (pendingEvent) {
                    yield pendingEvent;
                    pendingEvent = null;
                }
            }
        }

        flushBuffer();
        if (pendingEvent) {
            yield pendingEvent;
            pendingEvent = null;
        }

        if (currentEvent) {
            yield { event: currentEvent, data: currentData };
        }
    } finally {
        reader.releaseLock();
    }
}

function resolveSelection(model: string): { activeProvider: Provider; activeModel: string } {
    const provider = MODEL_PROVIDER_MAP[model];

    if (provider) {
        const validModels = PROVIDER_MODELS[provider].map((option) => option.id);
        return {
            activeProvider: provider,
            activeModel: validModels.includes(model) ? model : DEFAULT_MODELS[provider],
        };
    }

    return {
        activeProvider: 'openai',
        activeModel: DEFAULT_MODELS['openai'],
    };
}

export const useChatStore = create<ChatState>()(
    persist((set, get) => ({
        messages: [],
        isLoading: false,
        error: null,
        activeProvider: 'openai',
        activeModel: DEFAULT_MODELS['openai'],
        hydrated: false,

        sendMessage: async (text) => {
            const trimmed = text.trim();
            if (!trimmed) return;

            const state = get();
            const userMessage: ChatMessage = { role: 'user', content: trimmed };
            const messages = [...state.messages, userMessage];

            set({ messages, isLoading: true, error: null });

            try {
                // MVP: n8n JSON proxy path. Replaces the previous SSE stream.
                const response = await apiClient.post<{ answer: string }>('/chat/n8n', {
                    message: trimmed,
                });

                set({
                    isLoading: false,
                    messages: [
                        ...messages,
                        { role: 'assistant', content: response.answer },
                    ],
                });
            } catch (err) {
                const message = err instanceof Error ? err.message : 'No se pudo enviar el mensaje';
                set({
                    error: message,
                    isLoading: false,
                    messages: [
                        ...messages,
                        { role: 'assistant', content: '' },
                    ],
                });
            }

            // ROLLBACK BLOCK: to restore the legacy SSE `/chat/stream` transport,
            // re-introduce an `AbortController` + `abort()` action, then uncomment
            // the block below and remove the n8n JSON block above.
            //
            // const abortController = new AbortController();
            // try {
            //     const stream = await apiClient.stream('/chat/stream', {
            //         model: state.activeModel,
            //         messages: messages.map((m) => ({ role: m.role, content: m.content })),
            //         provider: state.activeProvider,
            //         enable_tools: true,
            //     });
            //
            //     let assistantContent = '';
            //
            //     for await (const chunk of readSSEChunks(stream)) {
            //         if (abortController.signal.aborted) break;
            //
            //         if (chunk.event === 'delta') {
            //             assistantContent += chunk.data;
            //             set({
            //                 messages: [
            //                     ...messages,
            //                     { role: 'assistant', content: assistantContent },
            //                 ],
            //             });
            //         } else if (chunk.event === 'error') {
            //             set({
            //                 error: chunk.data || 'Error de streaming',
            //                 isLoading: false,
            //                 messages: [
            //                     ...messages,
            //                     { role: 'assistant', content: assistantContent },
            //                 ],
            //             });
            //             return;
            //         } else if (chunk.event === 'done') {
            //             break;
            //         }
            //     }
            //
            //     set({
            //         isLoading: false,
            //         messages: [
            //             ...messages,
            //             { role: 'assistant', content: assistantContent },
            //         ],
            //     });
            // } catch (err) {
            //     const message = err instanceof Error ? err.message : 'No se pudo enviar el mensaje';
            //     set({
            //         error: message,
            //         isLoading: false,
            //         messages: [
            //             ...messages,
            //             { role: 'assistant', content: '' },
            //         ],
            //     });
            // }
        },

        clearMessages: () => set({ messages: [], error: null }),

        setActiveModel: (model) =>
            set((state) => ({
                activeModel: model,
                activeProvider: MODEL_PROVIDER_MAP[model] ?? state.activeProvider,
            })),

        hydrate: (model) => {
            const selection = resolveSelection(model);
            set({
                activeProvider: selection.activeProvider,
                activeModel: selection.activeModel,
                hydrated: true,
            });
        },

        clearError: () => set({ error: null }),
    }), {
        name: 'cortex-chat-preferences',
        partialize: (state) => ({
            activeModel: state.activeModel,
        }),
        onRehydrateStorage: () => (state) => {
            if (!state) return;

            const persistedModel = state.activeModel ?? DEFAULT_MODELS['openai'];
            state.hydrate(persistedModel);
        },
    })
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Legacy imports kept for rollback to backend-mediated transport.
import { apiClient } from '@/services/api/client';
import { HermesError, streamChat } from '@/services/hermes/client';

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
    _abortController: AbortController | null;

    sendMessage: (text: string) => Promise<void>;
    abort: () => void;
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
        _abortController: null,

        sendMessage: async (text) => {
            const trimmed = text.trim();
            if (!trimmed) return;

            const state = get();
            const userMessage: ChatMessage = { role: 'user', content: trimmed };
            const messages = [...state.messages, userMessage];

            set({ messages, isLoading: true, error: null });

            const abortController = new AbortController();
            set({ _abortController: abortController });

            let assistantContent = '';
            const buildAssistantMessage = (): ChatMessage => ({
                role: 'assistant',
                content: assistantContent,
            });

            try {
                for await (const delta of streamChat({
                    model: state.activeModel,
                    messages: messages.map((m) => ({ role: m.role, content: m.content })),
                    signal: abortController.signal,
                })) {
                    assistantContent += delta;
                    set({
                        messages: [...messages, buildAssistantMessage()],
                    });
                }

                set({
                    isLoading: false,
                    messages: [...messages, buildAssistantMessage()],
                });
            } catch (err) {
                if (err instanceof HermesError) {
                    set({
                        error: err.message,
                        isLoading: false,
                        messages: [...messages, buildAssistantMessage()],
                    });
                    return;
                }

                const message = err instanceof Error ? err.message : 'No se pudo enviar el mensaje';
                set({
                    error: message,
                    isLoading: false,
                    messages: [
                        ...messages,
                        { role: 'assistant', content: '' },
                    ],
                });
            } finally {
                set({ _abortController: null });
            }
        },

        abort: () => {
            const { _abortController } = get();
            if (_abortController) {
                _abortController.abort();
                set({ isLoading: false, _abortController: null });
            }
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

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { apiClient } from '@/services/api/client';
import { HermesError } from '@/services/hermes/client';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatState {
    messages: ChatMessage[];
    isLoading: boolean;
    error: string | null;

    sendMessage: (text: string) => Promise<void>;
    clearMessages: () => void;
    clearError: () => void;
}

export const useChatStore = create<ChatState>()(
    persist((set, get) => ({
        messages: [],
        isLoading: false,
        error: null,

        sendMessage: async (text) => {
            const trimmed = text.trim();
            if (!trimmed) return;

            const state = get();
            const userMessage: ChatMessage = { role: 'user', content: trimmed };
            const messages = [...state.messages, userMessage];

            set({ messages, isLoading: true, error: null });

            try {
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
                if (err instanceof HermesError) {
                    set({
                        error: err.message,
                        isLoading: false,
                        messages: [...messages, { role: 'assistant', content: '' }],
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
            }
        },

        clearMessages: () => set({ messages: [], error: null }),

        clearError: () => set({ error: null }),
    }), {
        name: 'cortex-chat-preferences',
        partialize: () => ({}),
        onRehydrateStorage: () => (state) => {
            if (state) {
                // Strip legacy model/provider keys in memory only; the persisted
                // storage entry is left untouched (messages share this key).
                delete (state as { activeModel?: unknown }).activeModel;
                delete (state as { activeProvider?: unknown }).activeProvider;
            }
        },
    })
);

import { create } from 'zustand';

import { apiClient } from '@/services/api/client';

export type Provider = 'openai' | 'anthropic' | 'gemini' | 'deepseek';

export interface CredentialInfo {
    id: string;
    provider: Provider;
    label: string | null;
    validated_at: string | null;
}

interface CredentialsState {
    providers: Record<Provider, CredentialInfo | undefined>;
    isLoading: boolean;
    error: string | null;

    fetchCredentials: () => Promise<void>;
    saveCredential: (provider: Provider, api_key: string, label?: string) => Promise<void>;
    deleteCredential: (provider: Provider) => Promise<void>;
    testCredential: (provider: Provider, api_key: string, model: string) => Promise<boolean>;
    getValidatedProviders: () => Provider[];
    clearError: () => void;
}

export const useCredentialsStore = create<CredentialsState>((set, get) => ({
    providers: {},
    isLoading: false,
    error: null,

    fetchCredentials: async () => {
        set({ isLoading: true, error: null });
        try {
            const credentials = await apiClient.get<Array<{ id: string; provider: Provider; label: string | null; validated_at: string | null }>>('/provider-credentials');
            const providers: Record<Provider, CredentialInfo | undefined> = {};
            for (const cred of credentials) {
                providers[cred.provider] = {
                    id: cred.id,
                    provider: cred.provider,
                    label: cred.label,
                    validated_at: cred.validated_at,
                };
            }
            set({ providers, isLoading: false });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch credentials';
            set({ error: message, isLoading: false });
        }
    },

    saveCredential: async (provider, api_key, label) => {
        set({ isLoading: true, error: null });
        try {
            const response = await apiClient.post<CredentialInfo>('/provider-credentials', {
                provider,
                api_key,
                label,
            });
            set((state) => ({
                providers: { ...state.providers, [provider]: response },
                isLoading: false,
            }));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save credential';
            set({ error: message, isLoading: false });
        }
    },

    deleteCredential: async (provider) => {
        set({ isLoading: true, error: null });
        try {
            await apiClient.delete(`/provider-credentials/${provider}`);
            set((state) => {
                const next = { ...state.providers };
                delete next[provider];
                return { providers: next, isLoading: false };
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete credential';
            set({ error: message, isLoading: false });
        }
    },

    testCredential: async (provider, api_key, model) => {
        try {
            const result = await apiClient.post<{ valid: boolean }>('/provider-credentials/test', {
                provider,
                api_key,
                model,
            });
            return result.valid;
        } catch {
            return false;
        }
    },

    getValidatedProviders: () => {
        const state = get();
        return (Object.keys(state.providers) as Provider[]).filter(
            (p) => state.providers[p]?.validated_at !== null
        );
    },

    clearError: () => set({ error: null }),
}));

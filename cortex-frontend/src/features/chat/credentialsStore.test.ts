import { describe, expect, it, vi, beforeEach } from 'vitest';

import { apiClient } from '@/services/api/client';
import { useCredentialsStore } from './credentialsStore';

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

describe('useCredentialsStore', () => {
    beforeEach(() => {
        useCredentialsStore.setState({
            providers: {},
            isLoading: false,
            error: null,
        });
        vi.clearAllMocks();
    });

    it('should initialize with default state', () => {
        const state = useCredentialsStore.getState();

        expect(state.providers).toEqual({});
        expect(state.isLoading).toBe(false);
        expect(state.error).toBeNull();
    });

    describe('fetchCredentials', () => {
        it('should populate providers map from API response', async () => {
            vi.mocked(apiClient.get).mockResolvedValueOnce([
                { id: 'cred-1', provider: 'openai', label: 'Personal Key', validated_at: '2024-01-01T00:00:00Z' },
                { id: 'cred-2', provider: 'anthropic', label: 'Work Key', validated_at: null },
            ]);

            const { fetchCredentials } = useCredentialsStore.getState();
            await fetchCredentials();

            const state = useCredentialsStore.getState();
            expect(state.providers).toEqual({
                openai: { id: 'cred-1', provider: 'openai', label: 'Personal Key', validated_at: '2024-01-01T00:00:00Z' },
                anthropic: { id: 'cred-2', provider: 'anthropic', label: 'Work Key', validated_at: null },
            });
            expect(state.isLoading).toBe(false);
            expect(state.error).toBeNull();
        });

        it('should handle fetch error', async () => {
            vi.mocked(apiClient).get.mockRejectedValueOnce(new Error('Network error'));

            const { fetchCredentials } = useCredentialsStore.getState();
            await fetchCredentials();

            const state = useCredentialsStore.getState();
            expect(state.error).toBe('Network error');
            expect(state.isLoading).toBe(false);
        });

        it('should set loading state during fetch', async () => {
            vi.mocked(apiClient).get.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve([]), 10)));

            const { fetchCredentials } = useCredentialsStore.getState();
            const promise = fetchCredentials();

            expect(useCredentialsStore.getState().isLoading).toBe(true);

            await promise;
            expect(useCredentialsStore.getState().isLoading).toBe(false);
        });
    });

    describe('saveCredential', () => {
        it('should send API key to backend and update store', async () => {
            vi.mocked(apiClient).post.mockResolvedValueOnce({
                id: 'cred-new',
                provider: 'openai',
                label: 'New Key',
                validated_at: '2024-06-06T12:00:00Z',
            });

            const { saveCredential } = useCredentialsStore.getState();
            await saveCredential('openai', 'sk-test-key-123', 'New Key');

            expect(vi.mocked(apiClient).post).toHaveBeenCalledWith('/provider-credentials', {
                provider: 'openai',
                api_key: 'sk-test-key-123',
                label: 'New Key',
            });

            const state = useCredentialsStore.getState();
            expect(state.providers.openai).toEqual({
                id: 'cred-new',
                provider: 'openai',
                label: 'New Key',
                validated_at: '2024-06-06T12:00:00Z',
            });
        });

        it('should handle save error', async () => {
            vi.mocked(apiClient).post.mockRejectedValueOnce(new Error('Save failed'));

            const { saveCredential } = useCredentialsStore.getState();
            await saveCredential('openai', 'key', 'Label');

            const state = useCredentialsStore.getState();
            expect(state.error).toBe('Save failed');
        });
    });

    describe('deleteCredential', () => {
        it('should remove provider from store after delete', async () => {
            useCredentialsStore.setState({
                providers: {
                    openai: { id: 'cred-1', provider: 'openai', label: 'Key', validated_at: null },
                },
            });

            vi.mocked(apiClient).delete.mockResolvedValueOnce(undefined);

            const { deleteCredential } = useCredentialsStore.getState();
            await deleteCredential('openai');

            expect(vi.mocked(apiClient).delete).toHaveBeenCalledWith('/provider-credentials/openai');

            const state = useCredentialsStore.getState();
            expect(state.providers.openai).toBeUndefined();
        });

        it('should handle delete error', async () => {
            vi.mocked(apiClient).delete.mockRejectedValueOnce(new Error('Delete failed'));

            const { deleteCredential } = useCredentialsStore.getState();
            await deleteCredential('openai');

            const state = useCredentialsStore.getState();
            expect(state.error).toBe('Delete failed');
        });
    });

    describe('testCredential', () => {
        it('should return validation result from API', async () => {
            vi.mocked(apiClient).post.mockResolvedValueOnce({ valid: true });

            const { testCredential } = useCredentialsStore.getState();
            const result = await testCredential('openai', 'sk-test', 'gpt-4o');

            expect(vi.mocked(apiClient).post).toHaveBeenCalledWith('/provider-credentials/test', {
                provider: 'openai',
                api_key: 'sk-test',
                model: 'gpt-4o',
            });
            expect(result).toBe(true);
        });

        it('should return false when API says invalid', async () => {
            vi.mocked(apiClient).post.mockResolvedValueOnce({ valid: false });

            const { testCredential } = useCredentialsStore.getState();
            const result = await testCredential('openai', 'sk-bad', 'gpt-4o');

            expect(result).toBe(false);
        });
    });

    describe('getValidatedProviders', () => {
        it('should return only providers with validated_at', () => {
            useCredentialsStore.setState({
                providers: {
                    openai: { id: '1', provider: 'openai', label: 'Key', validated_at: '2024-01-01T00:00:00Z' },
                    anthropic: { id: '2', provider: 'anthropic', label: 'Key', validated_at: null },
                    gemini: { id: '3', provider: 'gemini', label: 'Key', validated_at: '2024-02-01T00:00:00Z' },
                    deepseek: { id: '4', provider: 'deepseek', label: 'Key', validated_at: null },
                },
            });

            const { getValidatedProviders } = useCredentialsStore.getState();
            const validated = getValidatedProviders();

            expect(validated).toEqual(['openai', 'gemini']);
        });

        it('should return empty array when no providers', () => {
            const { getValidatedProviders } = useCredentialsStore.getState();
            const validated = getValidatedProviders();

            expect(validated).toEqual([]);
        });
    });
});

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { apiClient } from './client';

const API_BASE_URL = 'http://localhost:8000';

describe('apiClient.delete', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.clearAllMocks();
    });

    it('resolves without parsing JSON for 204 No Content', async () => {
        const response = new Response(null, { status: 204 });
        const jsonSpy = vi.spyOn(response, 'json');

        globalThis.fetch = vi.fn().mockResolvedValue(response);

        await expect(apiClient.delete('/breweries/1')).resolves.toBeUndefined();
        expect(jsonSpy).not.toHaveBeenCalled();
    });

    it('throws an error with the server detail when delete fails', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ detail: 'No tiene permiso para eliminar' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        await expect(apiClient.delete('/breweries/1')).rejects.toThrow('No tiene permiso para eliminar');
    });
});

describe('apiClient.stream', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.clearAllMocks();
    });

    it('should make a POST request with correct headers and body', async () => {
        const mockResponse = new Response(new ReadableStream(), {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
        });

        const fetchSpy = vi.fn().mockResolvedValue(mockResponse);
        globalThis.fetch = fetchSpy;

        const body = { model: 'gpt-4o', messages: [{ role: 'user', content: 'hello' }], provider: 'openai' };
        await apiClient.stream('/chat/stream', body);

        expect(fetchSpy).toHaveBeenCalledWith(
            `${API_BASE_URL}/chat/stream`,
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                }),
                body: JSON.stringify(body),
            })
        );
    });

    it('should include Authorization header when session exists', async () => {
        const mockResponse = new Response(new ReadableStream(), {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
        });

        const fetchSpy = vi.fn().mockResolvedValue(mockResponse);
        globalThis.fetch = fetchSpy;

        // Mock auth store with session
        const { useAuthStore } = await import('@/features/auth/store');
        useAuthStore.setState({ session: { access_token: 'test-token-123' } });

        await apiClient.stream('/chat/stream', { test: true });

        expect(fetchSpy).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer test-token-123',
                }),
            })
        );
    });

    it('should return a ReadableStream from the response body', async () => {
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode('event: delta\ndata: hello\n\n'));
                controller.close();
            },
        });

        const mockResponse = new Response(stream, {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
        });

        globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

        const result = await apiClient.stream('/chat/stream', {});

        expect(result).toBeInstanceOf(ReadableStream);
    });

    it('should throw on non-ok response', async () => {
        const mockResponse = new Response('No autorizado', {
            status: 401,
            statusText: 'Unauthorized',
        });

        globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

        await expect(apiClient.stream('/chat/stream', {})).rejects.toThrow('No autorizado');
    });

    it('should throw unauthorized error on 401 and trigger logout', async () => {
        const mockResponse = new Response(null, {
            status: 401,
            statusText: 'Unauthorized',
        });

        globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

        await expect(apiClient.stream('/chat/stream', {})).rejects.toThrow('No autorizado');
    });
});

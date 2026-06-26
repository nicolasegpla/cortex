import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HermesError, parseSSEChunks, streamChat } from './client';

function createMockStream(chunks: string[], signal?: AbortSignal): ReadableStream<Uint8Array> {
    return new ReadableStream({
        start(controller) {
            if (signal?.aborted) {
                controller.error(new DOMException('Aborted', 'AbortError'));
                return;
            }

            const encoder = new TextEncoder();
            for (const chunk of chunks) {
                controller.enqueue(encoder.encode(chunk));
            }
            controller.close();
        },
    });
}

async function collectDeltas(generator: AsyncGenerator<string>): Promise<string[]> {
    const deltas: string[] = [];
    for await (const delta of generator) {
        deltas.push(delta);
    }
    return deltas;
}

describe('Hermes client', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.clearAllMocks();
        delete (import.meta.env as unknown as Record<string, string | undefined>).VITE_HERMES_CHAT_URL;
    });

    it('yields each delta.content chunk in order and stops at [DONE]', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(
                createMockStream([
                    'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
                    'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
                    'data: [DONE]\n\n',
                ]),
                { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
            )
        );

        const generator = streamChat({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: 'hi' }],
        });
        const deltas = await collectDeltas(generator);

        expect(deltas).toEqual(['Hello', ' world']);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            'https://hermes-railway-production-dfdb.up.railway.app/v1/chat/completions',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer hermes-railway-2026',
                }),
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [{ role: 'user', content: 'hi' }],
                    stream: true,
                }),
            })
        );
    });

    it('ignores non-data SSE lines', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(
                createMockStream([
                    ': ping\n\n',
                    'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
                    ': keep-alive\n\n',
                    'data: [DONE]\n\n',
                ]),
                { status: 200 }
            )
        );

        const deltas = await collectDeltas(
            streamChat({ model: 'gpt-4o', messages: [{ role: 'user', content: 'hi' }] })
        );

        expect(deltas).toEqual(['ok']);
    });

    it('forwards signal to fetch and aborting returns no error', async () => {
        const controller = new AbortController();
        controller.abort();

        globalThis.fetch = vi.fn().mockImplementation((_, init) => {
            if (init?.signal?.aborted) {
                return Promise.reject(new DOMException('Aborted', 'AbortError'));
            }
            return Promise.resolve(new Response(createMockStream([]), { status: 200 }));
        });

        const generator = streamChat({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: 'hi' }],
            signal: controller.signal,
        });

        await expect(collectDeltas(generator)).resolves.toEqual([]);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ signal: controller.signal })
        );
    });

    it('throws HermesError for non-2xx response', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(null, { status: 401, statusText: 'Unauthorized' })
        );

        const generator = streamChat({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: 'hi' }],
        });

        let caught: HermesError | undefined;
        try {
            await generator.next();
        } catch (error) {
            caught = error as HermesError;
        }

        expect(caught).toBeInstanceOf(HermesError);
        expect(caught?.type).toBe('http');
        expect(caught?.status).toBe(401);
    });

    it('throws HermesError for network failure', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

        const generator = streamChat({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: 'hi' }],
        });

        let caught: HermesError | undefined;
        try {
            await generator.next();
        } catch (error) {
            caught = error as HermesError;
        }

        expect(caught).toBeInstanceOf(HermesError);
        expect(caught?.type).toBe('network');
    });

    it('reads base URL from VITE_HERMES_CHAT_URL', async () => {
        (import.meta.env as unknown as Record<string, string | undefined>).VITE_HERMES_CHAT_URL =
            'https://hermes-staging.example.com';

        globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(createMockStream(['data: [DONE]\n\n']), { status: 200 })
        );

        await collectDeltas(
            streamChat({ model: 'gpt-4o', messages: [{ role: 'user', content: 'hi' }] })
        );

        expect(globalThis.fetch).toHaveBeenCalledWith(
            'https://hermes-staging.example.com/v1/chat/completions',
            expect.anything()
        );
    });
});

describe('parseSSEChunks', () => {
    it('extracts content from a single data line', async () => {
        const stream = createMockStream([
            'data: {"choices":[{"delta":{"content":"one"}}]}\n\n',
            'data: [DONE]\n\n',
        ]);

        const deltas = await collectDeltas(parseSSEChunks(stream));

        expect(deltas).toEqual(['one']);
    });

    it('reassembles data lines split across chunk boundaries', async () => {
        const stream = createMockStream([
            'data: {"choices":[{"delta":{"content":"Hel',
            'lo"}}]}\n\n',
            'data: [DONE]\n\n',
        ]);

        const deltas = await collectDeltas(parseSSEChunks(stream));

        expect(deltas).toEqual(['Hello']);
    });

    it('skips malformed JSON data lines without throwing', async () => {
        const stream = createMockStream([
            'data: not-json\n\n',
            'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
            'data: [DONE]\n\n',
        ]);

        const deltas = await collectDeltas(parseSSEChunks(stream));

        expect(deltas).toEqual(['ok']);
    });
});

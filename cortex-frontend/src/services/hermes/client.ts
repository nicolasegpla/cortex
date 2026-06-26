const DEFAULT_HERMES_CHAT_URL = 'https://hermes-railway-production-dfdb.up.railway.app';

// TEMPORARY: shared test bearer token — NOT production-safe, shares memory/access across users, do not deploy to real users.
const HERMES_BEARER_TOKEN = 'hermes-railway-2026';

const HERMES_ERROR_TYPE = {
    HTTP: 'http',
    NETWORK: 'network',
} as const;
type HermesErrorType = (typeof HERMES_ERROR_TYPE)[keyof typeof HERMES_ERROR_TYPE];

const MESSAGE_ROLE = {
    ASSISTANT: 'assistant',
    USER: 'user',
} as const;
type HermesMessageRole = (typeof MESSAGE_ROLE)[keyof typeof MESSAGE_ROLE];

export interface HermesMessage {
    role: HermesMessageRole;
    content: string;
}

export interface StreamChatParams {
    model: string;
    messages: HermesMessage[];
    signal?: AbortSignal;
}

export class HermesError extends Error {
    readonly type: HermesErrorType;
    readonly status?: number;

    constructor(type: HermesErrorType, status?: number) {
        const message =
            type === HERMES_ERROR_TYPE.HTTP && status !== undefined
                ? `Hermes request failed with status ${status}`
                : 'Network error while connecting to Hermes';

        super(message);
        this.type = type;
        this.status = status;
    }
}

interface Delta {
    content?: unknown;
}

interface Choice {
    delta?: Delta;
}

interface ChunkPayload {
    choices?: Choice[];
}

function getHermesBaseUrl(): string {
    const env = import.meta.env as unknown as Record<string, string | undefined>;
    return env.VITE_HERMES_CHAT_URL ?? DEFAULT_HERMES_CHAT_URL;
}

function isChoice(value: unknown): value is Choice {
    return typeof value === 'object' && value !== null && 'delta' in value;
}

function isChunkPayload(value: unknown): value is ChunkPayload {
    if (typeof value !== 'object' || value === null) return false;

    const choices = (value as Record<string, unknown>).choices;
    return choices === undefined || Array.isArray(choices);
}

function extractContent(payload: string): string | undefined {
    let parsed: unknown;
    try {
        parsed = JSON.parse(payload);
    } catch {
        return undefined;
    }

    if (!isChunkPayload(parsed)) return undefined;

    const choice = parsed.choices?.[0];
    if (!isChoice(choice)) return undefined;

    const content = choice.delta?.content;
    return typeof content === 'string' && content.length > 0 ? content : undefined;
}

type LineResult =
    | { kind: 'content'; content: string }
    | { kind: 'done' }
    | { kind: 'skip' };

function parseDataLine(line: string): LineResult {
    if (!line.startsWith('data: ')) return { kind: 'skip' };

    const payload = line.slice(6).trim();
    if (payload === '[DONE]') return { kind: 'done' };

    const content = extractContent(payload);
    return content !== undefined ? { kind: 'content', content } : { kind: 'skip' };
}

export async function* parseSSEChunks(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const rawLine of lines) {
                const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
                const result = parseDataLine(line);
                if (result.kind === 'done') return;
                if (result.kind === 'content') yield result.content;
            }
        }

        if (buffer.trim()) {
            const result = parseDataLine(buffer.trim());
            if (result.kind === 'done') return;
            if (result.kind === 'content') yield result.content;
        }
    } finally {
        reader.releaseLock();
    }
}

function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError';
}

export async function* streamChat(params: StreamChatParams): AsyncGenerator<string> {
    const { model, messages, signal } = params;
    const url = `${getHermesBaseUrl()}/v1/chat/completions`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${HERMES_BEARER_TOKEN}`,
            },
            body: JSON.stringify({ model, messages, stream: true }),
            signal,
        });

        if (!response.ok) {
            throw new HermesError(HERMES_ERROR_TYPE.HTTP, response.status);
        }

        if (!response.body) {
            throw new HermesError(HERMES_ERROR_TYPE.NETWORK);
        }

        yield* parseSSEChunks(response.body);
    } catch (error) {
        if (isAbortError(error)) return;
        if (error instanceof HermesError) throw error;
        throw new HermesError(HERMES_ERROR_TYPE.NETWORK);
    }
}

import { useAuthStore } from '@/features/auth/store';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface RequestConfig {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
}

async function request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const session = useAuthStore.getState().session;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...config.headers,
    };

    if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: config.method || 'GET',
        headers,
        body: config.body,
    });

    if (response.status === 401) {
        const loggedOut = await useAuthStore.getState().logout();
        if (loggedOut) {
            window.location.href = '/login';
        }
        throw new Error('Unauthorized');
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.detail || error.message || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}

async function streamRequest(endpoint: string, body: unknown): Promise<ReadableStream<Uint8Array>> {
    const session = useAuthStore.getState().session;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });

    if (response.status === 401) {
        const loggedOut = await useAuthStore.getState().logout();
        if (loggedOut) {
            window.location.href = '/login';
        }
        throw new Error('Unauthorized');
    }

    if (!response.ok) {
        const error = await response.text().catch(() => response.statusText);
        throw new Error(error || `HTTP ${response.status}`);
    }

    if (!response.body) {
        throw new Error('El cuerpo de la respuesta es nulo');
    }

    return response.body;
}

export const apiClient = {
    get: <T>(endpoint: string) => request<T>(endpoint),
    post: <T>(endpoint: string, data: unknown) =>
        request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
    put: <T>(endpoint: string, data: unknown) =>
        request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (endpoint: string) => request<void>(endpoint, { method: 'DELETE' }),
    stream: (endpoint: string, body: unknown) => streamRequest(endpoint, body),
};

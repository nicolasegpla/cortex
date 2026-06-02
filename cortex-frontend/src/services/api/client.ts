interface ApiRequestOptions extends RequestInit {
    path: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export async function apiRequest<TResponse>({ path, headers, ...options }: ApiRequestOptions): Promise<TResponse> {
    const response = await fetch(new URL(path, API_BASE_URL).toString(), {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    });

    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
    }

    return (await response.json()) as TResponse;
}

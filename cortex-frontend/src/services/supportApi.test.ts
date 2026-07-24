import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { useAuthStore } from '@/features/auth/store';

import { submitFeedback, supportApi } from './supportApi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const NETWORK_ERROR_MESSAGE = 'No se pudo conectar con el servidor. Verificá tu conexión.';

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

describe('supportApi.submitFeedback', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        useAuthStore.setState({ session: null });
        vi.clearAllMocks();
    });

    it('posts to /support/feedback with the POST method', async () => {
        const fetchSpy = vi.fn().mockResolvedValue(
            jsonResponse({ success: true, message: 'Mensaje enviado correctamente' })
        );
        globalThis.fetch = fetchSpy;

        await submitFeedback({ type: 'bug', subject: 'Crash', message: 'Steps to reproduce' });

        expect(fetchSpy).toHaveBeenCalledWith(
            `${API_BASE_URL}/support/feedback`,
            expect.objectContaining({ method: 'POST' })
        );
    });

    it('sends exactly the type, subject and message keys — no identity or context fields', async () => {
        const fetchSpy = vi.fn().mockResolvedValue(
            jsonResponse({ success: true, message: 'Mensaje enviado correctamente' })
        );
        globalThis.fetch = fetchSpy;

        await submitFeedback({ type: 'bug', subject: 'Crash', message: 'Steps to reproduce' });

        const [, config] = fetchSpy.mock.calls[0] as [string, RequestInit];
        const body = JSON.parse(config.body as string) as Record<string, unknown>;

        expect(Object.keys(body).sort()).toEqual(['message', 'subject', 'type']);
        expect(body).toEqual({ type: 'bug', subject: 'Crash', message: 'Steps to reproduce' });
        expect(body).not.toHaveProperty('currentUrl');
        expect(body).not.toHaveProperty('email');
        expect(body).not.toHaveProperty('role');
    });

    it('attaches the Bearer token from the auth store', async () => {
        const fetchSpy = vi.fn().mockResolvedValue(
            jsonResponse({ success: true, message: 'Mensaje enviado correctamente' })
        );
        globalThis.fetch = fetchSpy;

        useAuthStore.setState({ session: { access_token: 'support-token' } });

        await submitFeedback({ type: 'mejora', subject: 'Mejorar búsqueda', message: 'Sería útil filtrar' });

        expect(fetchSpy).toHaveBeenCalledWith(
            `${API_BASE_URL}/support/feedback`,
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer support-token',
                }),
            })
        );
    });

    it('resolves to the backend success result', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            jsonResponse({ success: true, message: 'Mensaje enviado correctamente' })
        );

        const result = await submitFeedback({
            type: 'nueva_funcion',
            subject: 'Exportar reportes',
            message: 'Necesito exportar a CSV',
        });

        expect(result).toEqual({ success: true, message: 'Mensaje enviado correctamente' });
    });

    it('maps TypeError network failures to a friendly Spanish message without throwing', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('failed to fetch'));

        const result = await submitFeedback({ type: 'bug', subject: 'Crash', message: 'Steps' });

        expect(result).toEqual({ success: false, message: NETWORK_ERROR_MESSAGE });
    });

    it('falls back to a generic Spanish message when the rejection is not an Error', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue('plain string rejection');

        const result = await submitFeedback({ type: 'bug', subject: 'Crash', message: 'Steps' });

        expect(result).toEqual({
            success: false,
            message: 'Ocurrió un error inesperado. Intentá de nuevo.',
        });
        expect(typeof result.message).toBe('string');
    });

    it('falls back to a generic Spanish message when the rejection is a plain object', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue({ code: 500 });

        const result = await submitFeedback({ type: 'bug', subject: 'Crash', message: 'Steps' });

        expect(result).toEqual({
            success: false,
            message: 'Ocurrió un error inesperado. Intentá de nuevo.',
        });
        expect(typeof result.message).toBe('string');
    });

    it('passes through the backend Spanish message on server errors', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            jsonResponse({ detail: 'El tipo de solicitud no es válido' }, 422)
        );

        const result = await submitFeedback({ type: 'otro', subject: 'Consulta', message: 'Detalle' });

        expect(result).toEqual({ success: false, message: 'El tipo de solicitud no es válido' });
    });

    it('always resolves to a FeedbackFormResult shape and exposes the same function on supportApi', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
            jsonResponse({ detail: 'El servicio de email no está disponible' }, 502)
        );

        const result = await submitFeedback({ type: 'bug', subject: 'S', message: 'M' });

        expect(typeof result.success).toBe('boolean');
        expect(typeof result.message).toBe('string');
        expect(Object.keys(result).sort()).toEqual(['message', 'success']);
        expect(supportApi.submitFeedback).toBe(submitFeedback);
    });
});

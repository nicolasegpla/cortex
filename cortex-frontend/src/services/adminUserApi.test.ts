import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { adminUserApi } from './adminUserApi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

describe('adminUserApi', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.clearAllMocks();
    });

    describe('createUser', () => {
        it('sends email and role only to the backend', async () => {
            const fetchSpy = vi.fn().mockResolvedValue(
                new Response(JSON.stringify({ id: 'user-123', email: 'new@example.com', role: 'operativo' }), {
                    status: 201,
                    headers: { 'Content-Type': 'application/json' },
                })
            );
            globalThis.fetch = fetchSpy;

            const { useAuthStore } = await import('@/features/auth/store');
            useAuthStore.setState({ session: { access_token: 'admin-token' } });

            await adminUserApi.createUser({
                email: 'new@example.com',
                role: 'operativo',
            });

            expect(fetchSpy).toHaveBeenCalledWith(
                `${API_BASE_URL}/admin/users`,
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer admin-token',
                    }),
                    body: JSON.stringify({
                        email: 'new@example.com',
                        role: 'operativo',
                    }),
                })
            );
        });

        it('throws when the backend rejects the payload', async () => {
            globalThis.fetch = vi.fn().mockResolvedValue(
                new Response(JSON.stringify({ detail: 'Rol no válido' }), {
                    status: 422,
                    headers: { 'Content-Type': 'application/json' },
                })
            );

            await expect(
                adminUserApi.createUser({
                    email: 'new@example.com',
                    role: 'admin',
                })
            ).rejects.toThrow('Rol no válido');
        });
    });

    describe('listUsers', () => {
        it('returns the users array from the backend response', async () => {
            globalThis.fetch = vi.fn().mockResolvedValue(
                new Response(JSON.stringify({ users: [{ id: 'user-1', email: 'one@example.com', role: 'operativo' }] }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            );

            const users = await adminUserApi.listUsers();

            expect(users).toEqual([{ id: 'user-1', email: 'one@example.com', role: 'operativo' }]);
        });
    });

    describe('deleteUser', () => {
        it('resolves without parsing JSON for 204 No Content', async () => {
            globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

            await expect(adminUserApi.deleteUser('user-1')).resolves.toBeUndefined();
        });
    });
});

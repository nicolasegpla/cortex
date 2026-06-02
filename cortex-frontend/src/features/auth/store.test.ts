import { describe, expect, it } from 'vitest';

import { useAuthStore } from './store';

describe('useAuthStore', () => {
    it('should initialize with default state', () => {
        const state = useAuthStore.getState();

        expect(state.user).toBeNull();
        expect(state.session).toBeNull();
        expect(state.role).toBeNull();
        expect(state.isLoading).toBe(false);
    });

    it('should set user and role on login', () => {
        const { login } = useAuthStore.getState();

        const mockUser = { id: '123', email: 'test@example.com' };
        const mockSession = { access_token: 'token123' };

        login(mockUser, mockSession, 'super_admin');

        const state = useAuthStore.getState();
        expect(state.user).toEqual(mockUser);
        expect(state.session).toEqual(mockSession);
        expect(state.role).toBe('super_admin');
    });

    it('should clear state on logout', () => {
        const { login, logout } = useAuthStore.getState();

        login({ id: '123' }, { access_token: 'token' }, 'operativo');
        logout();

        const state = useAuthStore.getState();
        expect(state.user).toBeNull();
        expect(state.session).toBeNull();
        expect(state.role).toBeNull();
    });

    it('should set loading state', () => {
        const { setLoading } = useAuthStore.getState();

        setLoading(true);
        expect(useAuthStore.getState().isLoading).toBe(true);

        setLoading(false);
        expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should update session with setSession', () => {
        const { setSession } = useAuthStore.getState();

        const mockSession = { access_token: 'new_token' };
        setSession(mockSession);

        expect(useAuthStore.getState().session).toEqual(mockSession);
    });
});

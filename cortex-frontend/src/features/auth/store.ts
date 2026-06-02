import { create } from 'zustand';

interface User {
    id: string;
    email: string;
}

interface Session {
    access_token: string;
}

interface AuthState {
    user: User | null;
    session: Session | null;
    role: string | null;
    isLoading: boolean;
    login: (user: User, session: Session, role: string) => void;
    logout: () => void;
    setLoading: (loading: boolean) => void;
    setSession: (session: Session) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    session: null,
    role: null,
    isLoading: false,

    login: (user, session, role) =>
        set({
            user,
            session,
            role,
            isLoading: false,
        }),

    logout: () =>
        set({
            user: null,
            session: null,
            role: null,
            isLoading: false,
        }),

    setLoading: (loading) => set({ isLoading: loading }),

    setSession: (session) => set({ session }),
}));

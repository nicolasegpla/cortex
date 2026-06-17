import { create } from 'zustand';

import { supabaseClient } from '@/services/supabase/client';

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
    isInitialized: boolean;
    login: (user: User, session: Session, role: string) => void;
    logout: () => void;
    setLoading: (loading: boolean) => void;
    setSession: (session: Session) => void;
    initialize: () => Promise<void>;
}

function extractUserAndRole(data: { user?: { id: string; email?: string; user_metadata?: { role?: string } } | null; session?: { access_token: string } | null }) {
    const user = data.user;
    const session = data.session;

    if (!user || !session) {
        return { user: null, session: null, role: null };
    }

    return {
        user: { id: user.id, email: user.email || '' },
        session: { access_token: session.access_token },
        role: user.user_metadata?.role || 'operativo',
    };
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    session: null,
    role: null,
    isLoading: false,
    isInitialized: false,

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

    initialize: async () => {
        if (!supabaseClient || !supabaseClient.auth) {
            set({ isInitialized: true });
            return;
        }

        // Restore existing session
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();

        if (sessionData?.session && !sessionError) {
            const { user, session, role } = extractUserAndRole({
                user: sessionData.session.user,
                session: sessionData.session,
            });

            if (user && session) {
                set({ user, session, role });
            }
        }

        // Listen for auth state changes
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                const { user, session: extractedSession, role } = extractUserAndRole({
                    user: session?.user ?? null,
                    session: session ?? null,
                });

                if (user && extractedSession) {
                    set({ user, session: extractedSession, role });
                }
            } else if (event === 'TOKEN_REFRESHED') {
                if (session?.access_token) {
                    set({ session: { access_token: session.access_token } });
                }
            } else if (event === 'SIGNED_OUT') {
                set({ user: null, session: null, role: null });
            }
        });

        set({ isInitialized: true });
    },
}));

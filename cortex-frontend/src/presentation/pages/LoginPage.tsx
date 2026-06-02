import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Input } from '@/presentation/components/atoms';
import { useAuthStore } from '@/features/auth/store';
import { supabaseClient } from '@/services/supabase/client';

type AuthMode = 'login' | 'register';

export function LoginPage() {
    const navigate = useNavigate();
    const { login, setLoading } = useAuthStore();
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [confirmationMessage, setConfirmationMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setConfirmationMessage('');
        setIsLoading(true);
        setLoading(true);

        try {
            if (!supabaseClient) {
                throw new Error('Supabase client not configured');
            }

            if (mode === 'login') {
                const { data, error: authError } = await supabaseClient.auth.signInWithPassword({
                    email,
                    password,
                });

                if (authError) {
                    throw new Error(authError.message);
                }

                if (data.user && data.session) {
                    const role = data.user.user_metadata?.role || 'operativo';
                    login(
                        { id: data.user.id, email: data.user.email || '' },
                        { access_token: data.session.access_token },
                        role
                    );
                    navigate('/');
                }
            } else {
                const { data, error: authError } = await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { role: 'operativo' },
                    },
                });

                if (authError) {
                    throw new Error(authError.message);
                }

                if (!data.session) {
                    setConfirmationMessage('Check your email to confirm your account.');
                } else if (data.user && data.session) {
                    const role = data.user.user_metadata?.role || 'operativo';
                    login(
                        { id: data.user.id, email: data.user.email || '' },
                        { access_token: data.session.access_token },
                        role
                    );
                    navigate('/');
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Authentication failed');
        } finally {
            setIsLoading(false);
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setMode((prev) => (prev === 'login' ? 'register' : 'login'));
        setError('');
        setConfirmationMessage('');
    };

    const isLogin = mode === 'login';

    return (
        <section aria-labelledby="auth-title">
            <div className="page-card page-card--narrow">
                <p className="page-card__eyebrow">Authentication</p>
                <h2 id="auth-title" className="page-card__title">
                    {isLogin ? 'Sign in to CORTEX' : 'Create account'}
                </h2>
                <p className="page-card__description">
                    {isLogin
                        ? 'Enter your credentials to access the brewery management system.'
                        : 'Sign up to get started with the brewery management system.'}
                </p>

                {error && (
                    <div className="error-message" role="alert">
                        {error}
                    </div>
                )}

                {confirmationMessage && (
                    <div className="success-message" role="status">
                        {confirmationMessage}
                    </div>
                )}

                <form className="page-form" onSubmit={handleSubmit}>
                    <Input
                        label="Email"
                        name="email"
                        type="email"
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <Input
                        label="Password"
                        name="password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <Button type="submit" disabled={isLoading}>
                        {isLoading
                            ? isLogin
                                ? 'Signing in...'
                                : 'Signing up...'
                            : isLogin
                                ? 'Continue'
                                : 'Sign up'}
                    </Button>
                </form>

                <div className="auth-mode-toggle">
                    <button
                        type="button"
                        onClick={toggleMode}
                        className="auth-mode-toggle__button"
                    >
                        {isLogin
                            ? 'Create account'
                            : 'Already have an account? Sign in'}
                    </button>
                </div>
            </div>
        </section>
    );
}

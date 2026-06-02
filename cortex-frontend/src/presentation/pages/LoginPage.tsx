import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Input } from '@/presentation/components/atoms';
import { useAuthStore } from '@/features/auth/store';
import { supabaseClient } from '@/services/supabase/client';

export function LoginPage() {
    const navigate = useNavigate();
    const { login, setLoading } = useAuthStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        setLoading(true);

        try {
            if (!supabaseClient) {
                throw new Error('Supabase client not configured');
            }

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
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setIsLoading(false);
            setLoading(false);
        }
    };

    return (
        <section aria-labelledby="login-title">
            <div className="page-card page-card--narrow">
                <p className="page-card__eyebrow">Authentication</p>
                <h2 id="login-title" className="page-card__title">
                    Sign in to CORTEX
                </h2>
                <p className="page-card__description">
                    Enter your credentials to access the brewery management system.
                </p>

                {error && (
                    <div className="error-message" role="alert">
                        {error}
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
                        {isLoading ? 'Signing in...' : 'Continue'}
                    </Button>
                </form>
            </div>
        </section>
    );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Input } from '@/presentation/components/atoms';
import { useAuthStore } from '@/features/auth/store';
import { supabaseClient } from '@/services/supabase/client';

function translateAuthError(message: string) {
    const normalized = message.toLowerCase();

    if (
        normalized.includes('supabase client not configured') ||
        normalized.includes('supabase no está configurado')
    ) {
        return 'Supabase no está configurado.';
    }

    if (
        normalized.includes('invalid login credentials') ||
        normalized.includes('invalid email or password')
    ) {
        return 'Email o contraseña incorrectos.';
    }

    if (normalized.includes('authentication failed')) {
        return 'No se pudo iniciar sesión.';
    }

    return message;
}

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
                throw new Error('Supabase no está configurado');
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
            setError(err instanceof Error ? translateAuthError(err.message) : 'No se pudo iniciar sesión.');
        } finally {
            setIsLoading(false);
            setLoading(false);
        }
    };

    return (
        <section aria-labelledby="auth-title">
            <div className="page-card page-card--narrow">
                <p className="page-card__eyebrow">Autenticación</p>
                <h2 id="auth-title" className="page-card__title">
                    Iniciá sesión en Cortex
                </h2>
                <p className="page-card__description">
                    Ingresá tus credenciales para acceder al sistema de gestión cervecera.
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
                        label="Contraseña"
                        name="password"
                        type="password"
                        placeholder="Ingresá tu contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Iniciando sesión...' : 'Continuar'}
                    </Button>
                </form>
            </div>
        </section>
    );
}

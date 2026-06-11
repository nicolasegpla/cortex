import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Input } from '@/presentation/components/atoms';
import { useAuthStore } from '@/features/auth/store';
import { supabaseClient } from '@/services/supabase/client';

type AuthMode = 'login' | 'register';

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

    if (normalized.includes('user already registered') || normalized.includes('already registered')) {
        return 'Este usuario ya está registrado.';
    }

    if (normalized.includes('authentication failed')) {
        return 'No se pudo iniciar sesión.';
    }

    return message;
}

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
                throw new Error('Supabase no está configurado');
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
                    setConfirmationMessage('Revisá tu email para confirmar tu cuenta.');
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
            setError(err instanceof Error ? translateAuthError(err.message) : 'No se pudo iniciar sesión.');
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
                <p className="page-card__eyebrow">Autenticación</p>
                <h2 id="auth-title" className="page-card__title">
                    {isLogin ? 'Iniciá sesión en Cortex' : 'Crear cuenta'}
                </h2>
                <p className="page-card__description">
                    {isLogin
                        ? 'Ingresá tus credenciales para acceder al sistema de gestión cervecera.'
                        : 'Registrate para empezar a usar el sistema de gestión cervecera.'}
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
                        label="Contraseña"
                        name="password"
                        type="password"
                        placeholder="Ingresá tu contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <Button type="submit" disabled={isLoading}>
                        {isLoading
                            ? isLogin
                                ? 'Iniciando sesión...'
                                : 'Creando cuenta...'
                            : isLogin
                                ? 'Continuar'
                                : 'Crear cuenta'}
                    </Button>
                </form>

                <div className="auth-mode-toggle">
                    <button
                        type="button"
                        onClick={toggleMode}
                        className="auth-mode-toggle__button"
                    >
                        {isLogin
                            ? 'Crear cuenta'
                            : '¿Ya tenés una cuenta? Iniciá sesión'}
                    </button>
                </div>
            </div>
        </section>
    );
}

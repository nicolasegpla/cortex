import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button, Input } from '@/presentation/components/atoms';
import { supabaseClient } from '@/services/supabase/client';
import { useAuthStore } from '@/features/auth/store';

import './InvitePage.scss';

function translateAuthError(message: string): string {
    const normalized = message.toLowerCase();

    if (normalized.includes('supabase client not configured') || normalized.includes('supabase no está configurado')) {
        return 'Supabase no está configurado.';
    }

    if (
        normalized.includes('token has expired') ||
        normalized.includes('invalid token') ||
        normalized.includes('expired') ||
        normalized.includes('code verifier')
    ) {
        return 'El enlace de invitación expiró o no es válido. Pedile al administrador que te envíe una nueva invitación.';
    }

    if (normalized.includes('password should be')) {
        return 'La contraseña no cumple con los requisitos de seguridad.';
    }

    return message;
}

export function InvitePage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login } = useAuthStore();

    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isExchanging, setIsExchanging] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function exchangeCode() {
            if (!supabaseClient) {
                setError('Supabase no está configurado.');
                setIsExchanging(false);
                return;
            }

            const code = searchParams.get('code');
            const type = searchParams.get('type');

            if (type !== 'invite' || !code) {
                setError('El enlace no es válido o está incompleto.');
                setIsExchanging(false);
                return;
            }

            const { data, error: exchangeError } = await supabaseClient.auth.exchangeCodeForSession(code);

            if (cancelled) {
                return;
            }

            if (exchangeError) {
                setError(translateAuthError(exchangeError.message));
                setIsExchanging(false);
                return;
            }

            if (!data.session || !data.user) {
                setError('No se pudo activar la cuenta. Volvé a intentar con un nuevo enlace.');
                setIsExchanging(false);
                return;
            }

            const role = data.user.user_metadata?.role || 'operativo';
            login(
                { id: data.user.id, email: data.user.email || '' },
                { access_token: data.session.access_token },
                role
            );

            setIsExchanging(false);
        }

        exchangeCode();

        return () => {
            cancelled = true;
        };
    }, [searchParams, login]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== passwordConfirm) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        if (!supabaseClient) {
            setError('Supabase no está configurado.');
            return;
        }

        setIsLoading(true);

        const { error: updateError } = await supabaseClient.auth.updateUser({ password });

        if (updateError) {
            setError(translateAuthError(updateError.message));
            setIsLoading(false);
            return;
        }

        navigate('/');
    };

    if (isExchanging) {
        return (
            <section className="invite-page" aria-labelledby="invite-title">
                <div className="page-card page-card--narrow">
                    <p className="page-card__eyebrow">Invitación</p>
                    <h2 id="invite-title" className="page-card__title">
                        Activando tu cuenta
                    </h2>
                    <p className="page-card__description">Esperá un momento mientras verificamos tu invitación.</p>
                    <div className="invite-page__spinner" />
                </div>
            </section>
        );
    }

    return (
        <section className="invite-page" aria-labelledby="invite-title">
            <div className="page-card page-card--narrow">
                <p className="page-card__eyebrow">Invitación</p>
                <h2 id="invite-title" className="page-card__title">
                    Establecé tu contraseña
                </h2>
                <p className="page-card__description">
                    Completá el proceso de activación creando una contraseña segura.
                </p>

                {error && (
                    <div className="error-message" role="alert">
                        {error}
                    </div>
                )}

                <form className="page-form" onSubmit={handleSubmit}>
                    <Input
                        label="Contraseña"
                        name="password"
                        type="password"
                        placeholder="Ingresá una contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={6}
                        required
                    />
                    <Input
                        label="Confirmar contraseña"
                        name="passwordConfirm"
                        type="password"
                        placeholder="Repetí la contraseña"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        minLength={6}
                        required
                    />
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Activando...' : 'Activar cuenta'}
                    </Button>
                </form>
            </div>
        </section>
    );
}

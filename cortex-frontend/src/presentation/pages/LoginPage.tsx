import { Button, Input } from '@/presentation/components/atoms';

export function LoginPage() {
    return (
        <section aria-labelledby="login-title">
            <div className="page-card page-card--narrow">
                <p className="page-card__eyebrow">Authentication</p>
                <h2 id="login-title" className="page-card__title">
                    Sign in to CORTEX
                </h2>
                <p className="page-card__description">
                    This form is a placeholder for the upcoming Supabase auth integration.
                </p>

                <form className="page-form">
                    <Input label="Email" name="email" type="email" placeholder="name@company.com" />
                    <Input label="Password" name="password" type="password" placeholder="Enter your password" />
                    <Button type="submit">Continue</Button>
                </form>
            </div>
        </section>
    );
}

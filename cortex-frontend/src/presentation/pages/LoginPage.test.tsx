import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

import { LoginPage } from '@/presentation/pages/LoginPage';

describe('LoginPage', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders login form with all required elements', () => {
        render(
            <BrowserRouter>
                <LoginPage />
            </BrowserRouter>
        );

        expect(screen.getByRole('heading', { name: /sign in to cortex/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
        expect(screen.getByText(/enter your credentials to access the brewery management system/i)).toBeInTheDocument();
    });
});

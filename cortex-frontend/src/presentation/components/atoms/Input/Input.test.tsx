import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Input } from './Input';

describe('Input', () => {
    afterEach(() => {
        cleanup();
    });
    it('renders a labelled input', () => {
        render(<Input label="Email" name="email" data-testid="email-input" />);

        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(screen.getByTestId('email-input')).toHaveAttribute('name', 'email');
    });

    it('renders an end adornment', () => {
        render(
            <Input
                label="Password"
                name="password"
                type="password"
                data-testid="password-input"
                endAdornment={<button type="button" data-testid="toggle">Show</button>}
            />
        );

        expect(screen.getByTestId('password-input')).toHaveClass('input-field__control--with-adornment');
        expect(screen.getByTestId('toggle')).toBeInTheDocument();
    });

    it('renders a red asterisk when required and showRequiredAsterisk is true', () => {
        render(<Input label="Email" name="email" required showRequiredAsterisk data-testid="email-input" />);

        const asterisk = screen.getByText('*');
        expect(asterisk).toBeInTheDocument();
        expect(asterisk).toHaveClass('input-field__required');
        expect(asterisk).toHaveAttribute('aria-hidden', 'true');
        expect(screen.getByTestId('email-input')).toBeRequired();
    });

    it('does not render an asterisk when required but showRequiredAsterisk is false', () => {
        render(<Input label="Email" name="email" required data-testid="email-input" />);

        expect(screen.queryByText('*')).not.toBeInTheDocument();
        expect(screen.getByTestId('email-input')).toBeRequired();
    });

    it('does not render an asterisk when not required', () => {
        render(<Input label="Email" name="email" data-testid="email-input" />);

        expect(screen.queryByText('*')).not.toBeInTheDocument();
    });
});

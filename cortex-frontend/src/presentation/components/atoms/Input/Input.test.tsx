import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Input } from './Input';

describe('Input', () => {
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
});

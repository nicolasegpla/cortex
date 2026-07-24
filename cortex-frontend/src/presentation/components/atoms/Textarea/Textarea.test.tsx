import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Textarea } from './Textarea';

describe('Textarea', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders a labelled textarea', () => {
        render(<Textarea label="Mensaje" />);

        const control = screen.getByLabelText('Mensaje');
        expect(control).toBeInTheDocument();
        expect(control.tagName).toBe('TEXTAREA');
    });

    it('respects the required attribute', () => {
        render(<Textarea label="Mensaje" required />);

        expect(screen.getByLabelText('Mensaje')).toBeRequired();
    });

    it('shows the placeholder', () => {
        render(<Textarea label="Mensaje" placeholder="Escribe aquí..." />);

        expect(screen.getByPlaceholderText('Escribe aquí...')).toBeInTheDocument();
    });

    it('forwards the name attribute', () => {
        render(<Textarea label="Mensaje" name="message" />);

        expect(screen.getByLabelText('Mensaje')).toHaveAttribute('name', 'message');
    });

    it('renders a red asterisk when required and showRequiredAsterisk is true', () => {
        render(<Textarea label="Mensaje" name="message" required showRequiredAsterisk />);

        const asterisk = screen.getByText('*');
        expect(asterisk).toBeInTheDocument();
        expect(asterisk).toHaveClass('textarea-field__required');
        expect(asterisk).toHaveAttribute('aria-hidden', 'true');
        expect(screen.getByLabelText('Mensaje')).toBeRequired();
    });

    it('does not render an asterisk when required but showRequiredAsterisk is false', () => {
        render(<Textarea label="Mensaje" name="message" required />);

        expect(screen.queryByText('*')).not.toBeInTheDocument();
        expect(screen.getByLabelText('Mensaje')).toBeRequired();
    });

    it('does not render an asterisk when not required', () => {
        render(<Textarea label="Mensaje" name="message" />);

        expect(screen.queryByText('*')).not.toBeInTheDocument();
    });
});

import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Select } from './Select';

describe('Select', () => {
    afterEach(() => {
        cleanup();
    });
    it('renders a labelled select with the provided options', () => {
        render(
            <Select
                label="País"
                name="pais"
                value=""
                options={[
                    { value: 'Colombia', label: 'Colombia' },
                    { value: 'Venezuela', label: 'Venezuela' },
                ]}
                onChange={vi.fn()}
            />
        );

        expect(screen.getByLabelText(/País/i)).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Colombia' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Venezuela' })).toBeInTheDocument();
    });

    it('calls onChange when the user selects a different option', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();

        render(
            <Select
                label="País"
                name="pais"
                value=""
                options={[
                    { value: 'Colombia', label: 'Colombia' },
                    { value: 'Venezuela', label: 'Venezuela' },
                ]}
                onChange={handleChange}
            />
        );

        await user.selectOptions(screen.getByLabelText(/País/i), 'Colombia');

        expect(handleChange).toHaveBeenCalledTimes(1);
        expect(handleChange.mock.calls[0][0].target.name).toBe('pais');
        expect(handleChange.mock.calls[0][0].target.value).toBe('Colombia');
    });

    it('renders a placeholder option when placeholder is provided', () => {
        render(
            <Select
                label="Ciudad"
                name="ciudad"
                value=""
                placeholder="Seleccione ciudad..."
                options={[{ value: 'Bogotá', label: 'Bogotá' }]}
                onChange={vi.fn()}
            />
        );

        expect(screen.getByRole('option', { name: 'Seleccione ciudad...' })).toHaveValue('');
        expect(screen.getByRole('option', { name: 'Bogotá' })).toHaveValue('Bogotá');
    });
});

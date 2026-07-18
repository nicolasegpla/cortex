import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PhoneListInput } from './PhoneListInput';

function StatefulPhoneListInput({ initialPhones = [] }: { initialPhones?: string[] }) {
    const [phones, setPhones] = useState(initialPhones);
    return <PhoneListInput phones={phones} onChange={setPhones} />;
}

describe('PhoneListInput', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders a row per phone with a deterministic label', () => {
        render(<PhoneListInput phones={['3001112222', '3003334444']} onChange={vi.fn()} />);

        expect(screen.getByLabelText('Teléfono 1')).toHaveValue('3001112222');
        expect(screen.getByLabelText('Teléfono 2')).toHaveValue('3003334444');
    });

    it('appends an empty row when the add button is clicked', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        render(<PhoneListInput phones={['3001112222']} onChange={onChange} />);

        await user.click(screen.getByRole('button', { name: /Agregar teléfono/i }));

        expect(onChange).toHaveBeenCalledWith(['3001112222', '']);
    });

    it('removes the correct row when a remove button is clicked', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();

        render(<PhoneListInput phones={['3001112222', '3003334444']} onChange={onChange} />);

        await user.click(screen.getByRole('button', { name: 'Eliminar teléfono 2' }));

        expect(onChange).toHaveBeenCalledWith(['3001112222']);
    });

    it('emits the updated ordered array when a phone value changes', async () => {
        const user = userEvent.setup();

        render(<StatefulPhoneListInput initialPhones={['3001112222']} />);

        await user.clear(screen.getByLabelText('Teléfono 1'));
        await user.type(screen.getByLabelText('Teléfono 1'), '3009998888');

        expect(screen.getByLabelText('Teléfono 1')).toHaveValue('3009998888');
    });

    it('preserves raw values including blanks and whitespace while editing', async () => {
        const user = userEvent.setup();

        render(<StatefulPhoneListInput initialPhones={['3001112222']} />);

        await user.type(screen.getByLabelText('Teléfono 1'), '   ');

        expect(screen.getByLabelText('Teléfono 1')).toHaveValue('3001112222   ');
    });

    it('disables all inputs and controls when disabled is true', () => {
        render(<PhoneListInput phones={['3001112222']} onChange={vi.fn()} disabled />);

        expect(screen.getByLabelText('Teléfono 1')).toBeDisabled();
        expect(screen.getByRole('button', { name: /Agregar teléfono/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Eliminar teléfono 1' })).toBeDisabled();
    });

    it('exposes an accessible group label and remove button labels', () => {
        render(<PhoneListInput phones={['3001112222']} onChange={vi.fn()} />);

        expect(screen.getByText('Teléfonos')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Eliminar teléfono 1' })).toBeInTheDocument();
    });

    it('renders no phone rows and only the add button for an empty list', () => {
        render(<PhoneListInput phones={[]} onChange={vi.fn()} />);

        expect(screen.queryByLabelText('Teléfono 1')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Agregar teléfono/i })).toBeInTheDocument();
    });
});

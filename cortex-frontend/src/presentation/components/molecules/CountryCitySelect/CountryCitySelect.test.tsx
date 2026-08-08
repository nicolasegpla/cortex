import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState, type ChangeEvent } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CountryCitySelect } from './CountryCitySelect';

function StatefulCountryCitySelect({
    initialPais = '',
    initialCiudad = '',
}: {
    initialPais?: string;
    initialCiudad?: string;
}) {
    const [{ pais, ciudad }, setValues] = useState({
        pais: initialPais,
        ciudad: initialCiudad,
    });

    const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setValues((prev) => ({ ...prev, [name]: value }));
    };

    return <CountryCitySelect pais={pais} ciudad={ciudad} onChange={handleChange} />;
}

describe('CountryCitySelect', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders country and city selects with no city options in create mode', () => {
        render(
            <CountryCitySelect
                pais=""
                ciudad=""
                onChange={vi.fn()}
            />
        );

        expect(screen.getByLabelText(/País/i)).toHaveValue('');
        expect(screen.getByLabelText(/Ciudad/i)).toHaveValue('');
        expect(screen.getByRole('option', { name: 'Colombia' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Venezuela' })).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: 'Bogotá D.C.' })).not.toBeInTheDocument();
    });

    it('populates city options when a country is selected', async () => {
        const user = userEvent.setup();

        render(<StatefulCountryCitySelect />);

        await user.selectOptions(screen.getByLabelText(/País/i), 'Colombia');

        expect(screen.getByLabelText(/País/i)).toHaveValue('Colombia');
        expect(screen.getByRole('option', { name: 'Amazonas' })).toHaveValue('amazonas');
        expect(screen.getByRole('option', { name: 'La guajira' })).toHaveValue('la guajira');
        expect(screen.getByRole('option', { name: 'Norte de santander' })).toHaveValue('norte de santander');
        expect(screen.getByRole('option', { name: 'San andres y providencia' })).toHaveValue('san andres y providencia');
        expect(screen.queryByRole('option', { name: 'Caracas' })).not.toBeInTheDocument();
    });

    it('clears the selected city when the country changes', async () => {
        const user = userEvent.setup();

        render(<StatefulCountryCitySelect initialPais="Colombia" initialCiudad="la guajira" />);

        expect(screen.getByLabelText(/Ciudad/i)).toHaveValue('la guajira');

        await user.selectOptions(screen.getByLabelText(/País/i), 'Venezuela');

        expect(screen.getByLabelText(/País/i)).toHaveValue('Venezuela');
        expect(screen.getByLabelText(/Ciudad/i)).toHaveValue('');
        expect(screen.queryByRole('option', { name: 'La guajira' })).not.toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Caracas' })).toBeInTheDocument();
    });

    it('preloads known pais and ciudad values in edit mode', () => {
        render(
            <CountryCitySelect
                pais="Colombia"
                ciudad="norte de santander"
                onChange={vi.fn()}
            />
        );

        expect(screen.getByLabelText(/País/i)).toHaveValue('Colombia');
        expect(screen.getByLabelText(/Ciudad/i)).toHaveValue('norte de santander');
        expect(screen.getByRole('option', { name: 'Norte de santander' })).toHaveValue('norte de santander');
    });

    it('renders an unknown legacy city as a transient option', () => {
        render(
            <CountryCitySelect
                pais="Colombia"
                ciudad="Palmira"
                onChange={vi.fn()}
            />
        );

        expect(screen.getByLabelText(/Ciudad/i)).toHaveValue('Palmira');
        expect(screen.getByRole('option', { name: 'Palmira' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Bogotá D.C.' })).toHaveValue('bogotá D.C.');
    });
});

import type { ChangeEvent } from 'react';

import { Select } from '@/presentation/components/atoms';
import { COUNTRY_CITY_MAP, resolveCityOptions } from '@/shared/locationData';

export interface CountryCitySelectProps {
    pais: string;
    ciudad: string;
    onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
    disabled?: boolean;
}

const COUNTRY_OPTIONS = Object.keys(COUNTRY_CITY_MAP).map((country) => ({
    value: country,
    label: country,
}));

function formatCityLabel(city: string): string {
    return `${city.charAt(0).toUpperCase()}${city.slice(1)}`;
}

export function CountryCitySelect({ pais, ciudad, onChange, disabled }: CountryCitySelectProps) {
    const cityOptions = resolveCityOptions(pais, ciudad).map((city) => ({
        value: city,
        label: formatCityLabel(city),
    }));

    const handleCountryChange = (e: ChangeEvent<HTMLSelectElement>) => {
        onChange(e);

        const syntheticEvent = {
            target: {
                name: 'ciudad',
                value: '',
            },
        } as unknown as ChangeEvent<HTMLSelectElement>;

        onChange(syntheticEvent);
    };

    return (
        <>
            <Select
                label="País"
                name="pais"
                value={pais}
                placeholder="Seleccione país..."
                options={COUNTRY_OPTIONS}
                onChange={handleCountryChange}
                disabled={disabled}
            />
            <Select
                label="Ciudad"
                name="ciudad"
                value={ciudad}
                placeholder="Seleccione ciudad..."
                options={cityOptions}
                onChange={onChange}
                disabled={disabled}
            />
        </>
    );
}

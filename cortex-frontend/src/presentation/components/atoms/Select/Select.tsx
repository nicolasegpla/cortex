import type { SelectHTMLAttributes } from 'react';

import './select.scss';

export interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
    label: string;
    name: string;
    value: string;
    options: SelectOption[];
    placeholder?: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export function Select({ className = '', id, label, name, options, placeholder, ...props }: SelectProps) {
    const selectId = id ?? name ?? label.toLowerCase().replace(/\s+/g, '-');

    return (
        <label className="select-field" htmlFor={selectId}>
            <span className="select-field__label">{label}</span>
            <select className={['select-field__control', className].filter(Boolean).join(' ')} id={selectId} name={name} {...props}>
                {placeholder && (
                    <option value="">{placeholder}</option>
                )}
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

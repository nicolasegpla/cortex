import type { InputHTMLAttributes } from 'react';

import './input.scss';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

export function Input({ className = '', id, label, name, ...props }: InputProps) {
    const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, '-');

    return (
        <label className="input-field" htmlFor={inputId}>
            <span className="input-field__label">{label}</span>
            <input className={["input-field__control", className].filter(Boolean).join(' ')} id={inputId} name={name} {...props} />
        </label>
    );
}

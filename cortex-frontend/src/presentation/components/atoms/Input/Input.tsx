import type { InputHTMLAttributes, ReactNode } from 'react';

import './input.scss';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    endAdornment?: ReactNode;
    showRequiredAsterisk?: boolean;
}

export function Input({ className = '', endAdornment, id, label, name, required, showRequiredAsterisk, ...props }: InputProps) {
    const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, '-');

    return (
        <div className="input-field">
            <div className="input-field__label-row">
                <label className="input-field__label" htmlFor={inputId}>
                    {label}
                </label>
                {required && showRequiredAsterisk && (
                    <span className="input-field__required" aria-hidden="true">*</span>
                )}
            </div>
            <span className="input-field__control-wrapper">
                <input
                    className={[
                        'input-field__control',
                        endAdornment ? 'input-field__control--with-adornment' : '',
                        className,
                    ].filter(Boolean).join(' ')}
                    id={inputId}
                    name={name}
                    required={required}
                    {...props}
                />
                {endAdornment && (
                    <span className="input-field__end-adornment">{endAdornment}</span>
                )}
            </span>
        </div>
    );
}

import type { InputHTMLAttributes, ReactNode } from 'react';

import './input.scss';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    endAdornment?: ReactNode;
}

export function Input({ className = '', endAdornment, id, label, name, ...props }: InputProps) {
    const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, '-');

    return (
        <div className="input-field">
            <label className="input-field__label" htmlFor={inputId}>
                {label}
            </label>
            <span className="input-field__control-wrapper">
                <input
                    className={[
                        'input-field__control',
                        endAdornment ? 'input-field__control--with-adornment' : '',
                        className,
                    ].filter(Boolean).join(' ')}
                    id={inputId}
                    name={name}
                    {...props}
                />
                {endAdornment && (
                    <span className="input-field__end-adornment">{endAdornment}</span>
                )}
            </span>
        </div>
    );
}

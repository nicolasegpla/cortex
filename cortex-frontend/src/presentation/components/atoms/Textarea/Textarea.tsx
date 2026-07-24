import type { TextareaHTMLAttributes } from 'react';

import './textarea.scss';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
    showRequiredAsterisk?: boolean;
}

export function Textarea({ className = '', id, label, name, required, showRequiredAsterisk, ...props }: TextareaProps) {
    const textareaId = id ?? name ?? label.toLowerCase().replace(/\s+/g, '-');

    return (
        <div className="textarea-field">
            <div className="textarea-field__label-row">
                <label className="textarea-field__label" htmlFor={textareaId}>
                    {label}
                </label>
                {required && showRequiredAsterisk && (
                    <span className="textarea-field__required" aria-hidden="true">*</span>
                )}
            </div>
            <textarea
                className={['textarea-field__control', className].filter(Boolean).join(' ')}
                id={textareaId}
                name={name}
                required={required}
                {...props}
            />
        </div>
    );
}

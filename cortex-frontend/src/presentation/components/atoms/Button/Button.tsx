import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

import './button.scss';

type ButtonVariant = 'primary' | 'secondary';

interface ButtonBaseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
}

type ButtonProps = PropsWithChildren<ButtonBaseProps>;

export function Button({ children, className = '', type = 'button', variant = 'primary', ...props }: ButtonProps) {
    const classes = ['button', `button--${variant}`, className].filter(Boolean).join(' ');

    return (
        <button className={classes} type={type} {...props}>
            {children}
        </button>
    );
}

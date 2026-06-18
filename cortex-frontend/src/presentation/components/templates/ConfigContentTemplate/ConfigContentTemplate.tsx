import type { ReactNode } from 'react';

import './ConfigContentTemplate.scss';

interface ConfigContentTemplateProps {
    eyebrow?: string;
    title: string;
    description: string;
    titleId?: string;
    actions?: ReactNode;
    children: ReactNode;
}

export function ConfigContentTemplate({
    eyebrow = 'Configuración',
    title,
    description,
    titleId,
    actions,
    children,
}: ConfigContentTemplateProps) {
    return (
        <div className="config-content-template">
            <header className="config-content-template__header">
                <div className="config-content-template__header-text">
                    <p className="config-content-template__eyebrow">{eyebrow}</p>
                    <h1 id={titleId} className="config-content-template__title">
                        {title}
                    </h1>
                    <p className="config-content-template__description">{description}</p>
                </div>
                {actions && <div className="config-content-template__actions">{actions}</div>}
            </header>
            <div className="config-content-template__body">{children}</div>
        </div>
    );
}

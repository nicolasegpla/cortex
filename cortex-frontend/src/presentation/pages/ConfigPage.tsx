import { Chat } from '@/presentation/components/atoms/Icon/Chat';
import { X } from '@/presentation/components/atoms/Icon/X';
import { ChatSettings } from '@/features/chat/ChatSettings';

import './ConfigPage.scss';

const CONFIG_TAB = {
    provider: 'provider',
} as const;

type ConfigTab = (typeof CONFIG_TAB)[keyof typeof CONFIG_TAB];

const navSections = [
    {
        heading: 'Funciones',
        items: [{ label: 'Proveedores de modelos', icon: Chat, tab: CONFIG_TAB.provider }],
    },
] as const;

interface ConfigPageProps {
    variant?: 'page' | 'modal';
    onClose?: () => void;
}

export function ConfigPage({ variant = 'page', onClose }: ConfigPageProps) {
    const activeTab: ConfigTab = CONFIG_TAB.provider;

    return (
        <section
            aria-labelledby="config-title"
            aria-modal={variant === 'modal' ? true : undefined}
            className={`config-page config-page--${variant}`}
            role={variant === 'modal' ? 'dialog' : undefined}
        >
            {onClose && (
                <button
                    type="button"
                    className="config-page__close"
                    aria-label="Cerrar configuración"
                    onClick={onClose}
                >
                    <X width={18} height={18} />
                </button>
            )}

            <div className="config-page__body">
                <aside className="config-page__nav" aria-label="Secciones de configuración">
                    <div className="config-page__nav-groups">
                        {navSections.map((section) => (
                            <div key={section.heading} className="config-page__nav-group">
                                <p className="config-page__nav-heading">{section.heading}</p>
                                <div className="config-page__nav-list">
                                    {section.items.map((item) => {
                                        const Icon = item.icon;

                                        if (item.placeholder) {
                                            return (
                                                <div key={item.label} className="config-page__nav-item config-page__nav-item--placeholder" aria-hidden="true">
                                                    <Icon className="config-page__nav-icon" width={16} height={16} />
                                                    <span>{item.label}</span>
                                                </div>
                                            );
                                        }

                                        return (
                                            <button
                                                key={item.label}
                                                type="button"
                                                className="config-page__nav-item config-page__nav-item--active"
                                                aria-current={activeTab === item.tab ? 'page' : undefined}
                                            >
                                                <Icon className="config-page__nav-icon" width={16} height={16} />
                                                <span>{item.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="config-page__nav-footer" aria-hidden="true">
                        <Chat className="config-page__nav-icon" width={16} height={16} />
                        <span>Ayuda y soporte</span>
                    </div>
                </aside>

                <div className="config-page__content">
                    <div className="config-page__content-inner">
                        <header className="config-page__header">
                            <p className="config-page__eyebrow">Configuración</p>
                            <h1 id="config-title" className="config-page__title">
                                Proveedores de modelos
                            </h1>
                            <p className="config-page__description">
                                Conectá y administrá las API keys que Cortex usa para acceder a tus proveedores de modelos.
                            </p>
                        </header>

                        <ChatSettings headingId="config-title" />
                    </div>
                </div>
            </div>
        </section>
    );
}

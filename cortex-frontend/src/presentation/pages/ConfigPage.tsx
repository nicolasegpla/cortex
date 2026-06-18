import { useState } from 'react';

import { Chat } from '@/presentation/components/atoms/Icon/Chat';
import { Admin } from '@/presentation/components/atoms/Icon/Admin';
import { X } from '@/presentation/components/atoms/Icon/X';
import { ConfigContentTemplate } from '@/presentation/components/templates/ConfigContentTemplate';
import { ChatSettings } from '@/features/chat/ChatSettings';
import { UserManagement } from '@/features/user-management';
import { useAuthStore } from '@/features/auth/store';

import './ConfigPage.scss';

const CONFIG_TAB = {
    provider: 'provider',
    users: 'users',
} as const;

type ConfigTab = (typeof CONFIG_TAB)[keyof typeof CONFIG_TAB];

interface ConfigPageProps {
    variant?: 'page' | 'modal';
    onClose?: () => void;
}

export function ConfigPage({ variant = 'page', onClose }: ConfigPageProps) {
    const [activeTab, setActiveTab] = useState<ConfigTab>(CONFIG_TAB.provider);
    const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
    const { role } = useAuthStore();
    const isSuperAdmin = role === 'super_admin';

    const navSections = [
        {
            heading: 'Funciones',
            items: [
                { label: 'Proveedores de modelos', icon: Chat, tab: CONFIG_TAB.provider },
                ...(isSuperAdmin ? [{ label: 'Usuarios', icon: Admin, tab: CONFIG_TAB.users }] : []),
            ],
        },
    ];

    const headerTitle = activeTab === CONFIG_TAB.users ? 'Administración de usuarios' : 'Proveedores de modelos';
    const headerDescription =
        activeTab === CONFIG_TAB.users
            ? 'Creá y gestioná los usuarios que tienen acceso a Cortex.'
            : 'Conectá y administrá las API keys que Cortex usa para acceder a tus proveedores de modelos.';

    return (
        <section
            aria-label={activeTab === CONFIG_TAB.users ? headerTitle : undefined}
            aria-labelledby={activeTab === CONFIG_TAB.provider ? 'config-title' : undefined}
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
                                        const isActive = activeTab === item.tab;

                                        return (
                                            <button
                                                key={item.label}
                                                type="button"
                                                className={`config-page__nav-item ${isActive ? 'config-page__nav-item--active' : ''}`}
                                                aria-current={isActive ? 'page' : undefined}
                                                onClick={() => setActiveTab(item.tab)}
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
                        <ConfigContentTemplate
                            eyebrow="Configuración"
                            title={headerTitle}
                            description={headerDescription}
                            titleId="config-title"
                        >
                            {activeTab === CONFIG_TAB.provider ? (
                                <ChatSettings headingId="config-title" />
                            ) : activeTab === CONFIG_TAB.users && isSuperAdmin ? (
                                <UserManagement
                                    isCreateModalOpen={isCreateUserModalOpen}
                                    onOpenCreateModal={() => setIsCreateUserModalOpen(true)}
                                    onCloseCreateModal={() => setIsCreateUserModalOpen(false)}
                                />
                            ) : null}
                        </ConfigContentTemplate>
                    </div>
                </div>
            </div>
        </section>
    );
}

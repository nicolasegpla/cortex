import { useState } from 'react';

import { Chat } from '@/presentation/components/atoms/Icon/Chat';
import { Admin } from '@/presentation/components/atoms/Icon/Admin';
import { X } from '@/presentation/components/atoms/Icon/X';
import { ConfigContentTemplate } from '@/presentation/components/templates/ConfigContentTemplate';
import { FeedbackModal } from '@/presentation/components/organisms';
import { UserManagement } from '@/features/user-management';
import { useAuthStore } from '@/features/auth/store';
import { submitFeedback } from '@/services/supportApi';

import './ConfigPage.scss';

const HEADER_TITLE = 'Administración de usuarios';
const HEADER_DESCRIPTION = 'Creá y gestioná los usuarios que tienen acceso a Cortex.';

interface ConfigPageProps {
    variant?: 'page' | 'modal';
    onClose?: () => void;
}

export function ConfigPage({ variant = 'page', onClose }: ConfigPageProps) {
    const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState<boolean>(false);
    const { role } = useAuthStore();
    const isSuperAdmin = role === 'super_admin';

    const navSections = isSuperAdmin
        ? [
              {
                  heading: 'Funciones',
                  items: [{ label: 'Usuarios', icon: Admin }],
              },
          ]
        : [];
    const hasVisibleItems = navSections.some((section) => section.items.length > 0);

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

            <div className={`config-page__body${hasVisibleItems ? '' : ' config-page__body--no-nav'}`}>
                {hasVisibleItems && (
                    <aside className="config-page__nav" aria-label="Secciones de configuración">
                        <div className="config-page__nav-groups">
                            {navSections.map((section) => (
                                <div key={section.heading} className="config-page__nav-group">
                                    <p className="config-page__nav-heading">{section.heading}</p>
                                    <div className="config-page__nav-list">
                                        {section.items.map((item) => {
                                            const Icon = item.icon;

                                            return (
                                                <button
                                                    key={item.label}
                                                    type="button"
                                                    className="config-page__nav-item config-page__nav-item--active"
                                                    aria-current="page"
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

                        <button
                            type="button"
                            className="config-page__nav-footer config-page__nav-item"
                            aria-label="Abrir ayuda y soporte"
                            aria-expanded={isFeedbackOpen}
                            onClick={() => setIsFeedbackOpen(true)}
                        >
                            <Chat className="config-page__nav-icon" width={16} height={16} />
                            <span>Ayuda y soporte</span>
                        </button>
                    </aside>
                )}

                <div className="config-page__content">
                    <div className="config-page__content-inner">
                        <ConfigContentTemplate
                            eyebrow="Configuración"
                            title={HEADER_TITLE}
                            description={HEADER_DESCRIPTION}
                            titleId="config-title"
                        >
                            {isSuperAdmin ? (
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

            {/* onSubmit wired to the real support API (CORTEXDIST-27): POST /support/feedback. */}
            <FeedbackModal
                isOpen={isFeedbackOpen}
                onClose={() => setIsFeedbackOpen(false)}
                onSubmit={submitFeedback}
            />
        </section>
    );
}

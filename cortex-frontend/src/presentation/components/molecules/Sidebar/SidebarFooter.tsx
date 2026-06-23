import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Download } from '@/presentation/components/atoms/Icon/Download';
import { Logout } from '@/presentation/components/atoms/Icon/Logout';
import { Share } from '@/presentation/components/atoms/Icon/Share';
import { useAuthStore } from '@/features/auth/store';
import { usePWAInstall } from '@/services/pwa/usePWAInstall';

interface SidebarFooterProps {
    collapsed: boolean;
}

export function SidebarFooter({ collapsed }: SidebarFooterProps) {
    const navigate = useNavigate();
    const { user, role, logout } = useAuthStore();
    const { isInstallable, isInstalled, isManualInstallEligible, promptInstall } = usePWAInstall();
    const [showIOSHint, setShowIOSHint] = useState(false);

    if (!user) {
        return null;
    }

    const handleLogout = async () => {
        const success = await logout();

        if (success) {
            navigate('/login');
        } else {
            window.alert('Logout failed. Please try again.');
        }
    };

    const handleInstall = async () => {
        await promptInstall();
    };

    const handleToggleIOSHint = () => {
        setShowIOSHint((previous) => !previous);
    };

    const handleCloseIOSHint = () => {
        setShowIOSHint(false);
    };

    const showInstallButton = isInstallable && !isInstalled;
    const showIOSFallback = !isInstallable && !isInstalled && isManualInstallEligible;

    return (
        <footer className="sidebar__footer">
            {!collapsed && (
                <div className="sidebar__footer-user-info">
                    <span
                        className="sidebar__footer-email"
                        style={{
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                        }}
                        title={user.email}
                    >
                        {user.email}
                    </span>
                    {role && <span className="sidebar__footer-role">{role}</span>}
                </div>
            )}

            <div className="sidebar__footer-actions">
                {showInstallButton && (
                    <button
                        type="button"
                        className="sidebar__footer-install"
                        onClick={handleInstall}
                        aria-label="Instalar aplicación"
                        title="Instalar aplicación"
                    >
                        <Download width={20} height={20} />
                    </button>
                )}

                {showIOSFallback && (
                    <div className="sidebar__footer-install-hint-wrapper">
                        <button
                            type="button"
                            className="sidebar__footer-install"
                            onClick={handleToggleIOSHint}
                            onBlur={handleCloseIOSHint}
                            aria-label="Mostrar instrucciones de instalación"
                            aria-expanded={showIOSHint}
                            title="Instalar esta aplicación"
                        >
                            <Share width={20} height={20} />
                        </button>
                        {showIOSHint && (
                            <div className="sidebar__footer-hint" role="tooltip">
                                Para instalar, toca Compartir en Safari y selecciona 'Agregar a
                                pantalla de inicio'.
                            </div>
                        )}
                    </div>
                )}

                <button
                    type="button"
                    className="sidebar__footer-logout"
                    onClick={handleLogout}
                    aria-label="Cerrar sesión"
                    title="Cerrar sesión"
                >
                    <Logout width={20} height={20} />
                </button>
            </div>
        </footer>
    );
}

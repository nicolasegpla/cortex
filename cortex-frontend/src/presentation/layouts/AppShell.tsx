import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { NAV_ITEM_ACTION, type NavItemAction } from '@/presentation/config/navigation';
import { Sidebar } from '@/presentation/components/molecules/Sidebar/Sidebar';
import { ThemeToggle } from '@/presentation/components/atoms/ThemeToggle/ThemeToggle';
import { ConfigPage } from '@/presentation/pages/ConfigPage';
import { Menu } from '@/presentation/components/atoms/Icon/Menu';
import { X } from '@/presentation/components/atoms/Icon/X';
import { hasNestedModal } from '@/shared/modalUtils';

import './AppShell.scss';

const MOBILE_BREAKPOINT = '(max-width: 768px)';

export function AppShell() {
    const location = useLocation();
    const isChatRoute = location.pathname === '/chat';
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const modalDialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT);
        const update = () => setIsMobile(mediaQuery.matches);
        update();
        mediaQuery.addEventListener('change', update);
        return () => mediaQuery.removeEventListener('change', update);
    }, []);

    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!isConfigOpen) {
            return undefined;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') {
                return;
            }

            const dialogEl = modalDialogRef.current;
            if (dialogEl && hasNestedModal(dialogEl)) {
                return;
            }

            setIsConfigOpen(false);
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isConfigOpen]);

    const handleSidebarAction = (action: NavItemAction) => {
        if (action === NAV_ITEM_ACTION.openConfig) {
            setIsConfigOpen(true);
            setMobileOpen(false);
        }
    };

    const sidebarCollapsed = isMobile ? !mobileOpen : undefined;

    return (
        <div className="app-shell">
            <Sidebar
                activeAction={isConfigOpen ? NAV_ITEM_ACTION.openConfig : null}
                onAction={handleSidebarAction}
                collapsed={sidebarCollapsed}
            />
            <div className="app-shell__content">
                <header className="app-shell__top-bar">
                    <div className="app-shell__top-bar-left">
                        {isMobile && (
                            <button
                                type="button"
                                onClick={() => setMobileOpen((prev) => !prev)}
                                className="app-shell__menu-button"
                                aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
                                aria-expanded={mobileOpen}
                                aria-controls="sidebar"
                                data-testid="mobile-menu-button"
                            >
                                {mobileOpen ? <X width={20} height={20} /> : <Menu width={20} height={20} />}
                            </button>
                        )}
                        <span className="app-shell__logo">Cortex</span>
                    </div>
                    <div className="app-shell__top-bar-right">
                        <ThemeToggle />
                    </div>
                </header>
                <main className={`app-shell__main ${isChatRoute ? 'app-shell__main--chat' : ''}`}>
                    <Outlet />
                </main>
            </div>

            {isMobile && mobileOpen && (
                <div
                    className="app-shell__sidebar-backdrop"
                    role="presentation"
                    data-testid="mobile-sidebar-backdrop"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {isConfigOpen && (
                <div
                    className="app-shell__modal-overlay"
                    role="presentation"
                    onClick={() => {
                        const dialogEl = modalDialogRef.current;
                        if (dialogEl && hasNestedModal(dialogEl)) {
                            return;
                        }
                        setIsConfigOpen(false);
                    }}
                >
                    <div ref={modalDialogRef} className="app-shell__modal-dialog" onClick={(event) => event.stopPropagation()}>
                        <ConfigPage variant="modal" onClose={() => setIsConfigOpen(false)} />
                    </div>
                </div>
            )}
        </div>
    );
}

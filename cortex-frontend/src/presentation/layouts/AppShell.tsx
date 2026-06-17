import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { NAV_ITEM_ACTION, type NavItemAction } from '@/presentation/config/navigation';
import { Sidebar } from '@/presentation/components/molecules/Sidebar/Sidebar';
import { ThemeToggle } from '@/presentation/components/atoms/ThemeToggle/ThemeToggle';
import { ConfigPage } from '@/presentation/pages/ConfigPage';
import { hasNestedModal } from '@/shared/modalUtils';

import './AppShell.scss';

export function AppShell() {
    const location = useLocation();
    const isChatRoute = location.pathname === '/chat';
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const modalDialogRef = useRef<HTMLDivElement>(null);

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
        }
    };

    return (
        <div className="app-shell">
            <Sidebar activeAction={isConfigOpen ? NAV_ITEM_ACTION.openConfig : null} onAction={handleSidebarAction} />
            <div className="app-shell__content">
                <header className="app-shell__top-bar">
                    <div className="app-shell__top-bar-left">
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

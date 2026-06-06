import { Outlet, useLocation } from 'react-router-dom';

import { Sidebar } from '@/presentation/components/molecules/Sidebar/Sidebar';
import { ThemeToggle } from '@/presentation/components/atoms/ThemeToggle/ThemeToggle';

import './AppShell.scss';

export function AppShell() {
    const location = useLocation();
    const isChatRoute = location.pathname === '/chat';

    return (
        <div className="app-shell">
            <Sidebar />
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
        </div>
    );
}

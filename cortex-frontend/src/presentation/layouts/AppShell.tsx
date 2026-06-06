import { Outlet } from 'react-router-dom';

import { Sidebar } from '@/presentation/components/molecules/Sidebar/Sidebar';
import { ThemeToggle } from '@/presentation/components/atoms/ThemeToggle/ThemeToggle';

import './AppShell.scss';

export function AppShell() {
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
                <main className="app-shell__main">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

import { NavLink, Outlet } from 'react-router-dom';

import './main-layout.scss';

const navigationItems = [
    { label: 'Dashboard', to: '/' },
    { label: 'Login', to: '/login' },
] as const;

export function MainLayout() {
    return (
        <div className="main-layout">
            <header className="main-layout__header">
                <div className="main-layout__header-content">
                    <div>
                        <p className="main-layout__eyebrow">CORTEX</p>
                        <h1 className="main-layout__title">Client workspace foundation</h1>
                    </div>

                    <nav aria-label="Primary navigation" className="main-layout__nav">
                        {navigationItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    isActive
                                        ? 'main-layout__nav-link main-layout__nav-link--active'
                                        : 'main-layout__nav-link'
                                }
                                end={item.to === '/'}
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>
            </header>

            <main className="main-layout__main">
                <Outlet />
            </main>
        </div>
    );
}

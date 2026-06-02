import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/features/auth/store';
import { supabaseClient } from '@/services/supabase/client';

import './main-layout.scss';

const navigationItems = [
    { label: 'Dashboard', to: '/' },
    { label: 'Breweries', to: '/breweries' },
] as const;

export function MainLayout() {
    const { user, role, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }
        logout();
        navigate('/login');
    };

    return (
        <div className="main-layout">
            <header className="main-layout__header">
                <div className="main-layout__header-content">
                    <div>
                        <p className="main-layout__eyebrow">CORTEX</p>
                        <h1 className="main-layout__title">Client workspace foundation</h1>
                    </div>

                    {user && (
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
                    )}

                    <div className="main-layout__user-section">
                        {user ? (
                            <>
                                <span className="user-info">
                                    {user.email} ({role})
                                </span>
                                <button onClick={handleLogout} className="logout-button">
                                    Logout
                                </button>
                            </>
                        ) : (
                            <NavLink to="/login" className="main-layout__nav-link">
                                Login
                            </NavLink>
                        )}
                    </div>
                </div>
            </header>

            <main className="main-layout__main">
                <Outlet />
            </main>
        </div>
    );
}

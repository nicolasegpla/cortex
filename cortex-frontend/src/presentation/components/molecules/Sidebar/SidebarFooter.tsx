import { useNavigate } from 'react-router-dom';

import { Logout } from '@/presentation/components/atoms/Icon/Logout';
import { useAuthStore } from '@/features/auth/store';
import { useSidebarStore } from '@/store/useSidebarStore';

export function SidebarFooter() {
    const navigate = useNavigate();
    const { user, role, logout } = useAuthStore();
    const { collapsed } = useSidebarStore();

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

            <button
                type="button"
                className="sidebar__footer-logout"
                onClick={handleLogout}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
            >
                <Logout width={20} height={20} />
            </button>
        </footer>
    );
}

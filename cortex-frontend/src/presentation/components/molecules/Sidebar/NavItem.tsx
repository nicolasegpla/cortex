import { NavLink } from 'react-router-dom';

import type { IconComponent } from '@/presentation/config/navigation';

interface NavItemProps {
    label: string;
    to: string;
    icon: IconComponent;
    end?: boolean;
}

export function NavItem({ label, to, icon: Icon, end }: NavItemProps) {
    return (
        <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
                isActive ? 'sidebar__nav-link sidebar__nav-link--active' : 'sidebar__nav-link'
            }
            aria-label={label}
        >
            <Icon width={20} height={20} />
            <span className="sidebar__nav-label">{label}</span>
        </NavLink>
    );
}

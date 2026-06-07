import { NavLink } from 'react-router-dom';

import { NAV_ITEM_KIND, type IconComponent, type NavItemAction, type NavItemKind } from '@/presentation/config/navigation';

interface NavItemProps {
    label: string;
    icon: IconComponent;
    kind?: NavItemKind;
    to?: string;
    action?: NavItemAction;
    end?: boolean;
    active?: boolean;
    onAction?: (action: NavItemAction) => void;
}

export function NavItem({ label, to, icon: Icon, kind = NAV_ITEM_KIND.route, action, end, active = false, onAction }: NavItemProps) {
    const className = active ? 'sidebar__nav-link sidebar__nav-link--active' : 'sidebar__nav-link';

    if (kind === NAV_ITEM_KIND.action && action) {
        return (
            <button
                type="button"
                className={className}
                aria-label={label}
                aria-pressed={active}
                onClick={() => onAction?.(action)}
            >
                <Icon width={20} height={20} />
                <span className="sidebar__nav-label">{label}</span>
            </button>
        );
    }

    if (!to) {
        return null;
    }

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

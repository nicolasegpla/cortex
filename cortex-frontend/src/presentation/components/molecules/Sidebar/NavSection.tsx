import { NAV_ITEM_ACTION, type NavItemAction, type NavSection as NavSectionType } from '@/presentation/config/navigation';
import { NavItem } from './NavItem';
import { useAuthStore } from '@/features/auth/store';

interface NavSectionProps {
    section: NavSectionType;
    activeAction?: NavItemAction | null;
    onAction?: (action: NavItemAction) => void;
}

export function NavSection({ section, activeAction = null, onAction }: NavSectionProps) {
    const { role } = useAuthStore();

    const visibleItems = section.items.filter((item) => {
        if (!item.requiredRole) {
            return true;
        }
        return role === item.requiredRole;
    });

    if (visibleItems.length === 0) {
        return null;
    }

    return (
        <div className="sidebar__section">
            <span className="sidebar__section-title">{section.title}</span>
            <ul className="sidebar__section-list" role="list">
                {visibleItems.map((item) => (
                    <li key={item.to ?? item.action ?? item.label}>
                        <NavItem
                            label={item.label}
                            to={item.to}
                            icon={item.icon}
                            kind={item.kind}
                            action={item.action}
                            end={item.end}
                            active={item.action === NAV_ITEM_ACTION.openConfig && activeAction === item.action}
                            onAction={onAction}
                        />
                    </li>
                ))}
            </ul>
        </div>
    );
}

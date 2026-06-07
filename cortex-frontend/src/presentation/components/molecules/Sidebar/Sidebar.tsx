import type { NavItemAction } from '@/presentation/config/navigation';
import { ChevronLeft } from '@/presentation/components/atoms/Icon/ChevronLeft';
import { useSidebarStore } from '@/store/useSidebarStore';
import { navigationConfig } from '@/presentation/config/navigation';
import { NavSection } from './NavSection';

interface SidebarProps {
    activeAction?: NavItemAction | null;
    onAction?: (action: NavItemAction) => void;
}

export function Sidebar({ activeAction = null, onAction }: SidebarProps) {
    const { collapsed, toggle } = useSidebarStore();

    return (
        <aside
            className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}
            aria-label="Main navigation"
            data-testid="sidebar"
        >
            <div className="sidebar__header">
                <button
                    type="button"
                    onClick={toggle}
                    className="sidebar__toggle"
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <ChevronLeft
                        width={20}
                        height={20}
                        className={`sidebar__toggle-icon${collapsed ? ' sidebar__toggle-icon--collapsed' : ''}`}
                    />
                </button>
            </div>

            <nav className="sidebar__nav" aria-label="Main">
                {navigationConfig.map((section) => (
                    <NavSection key={section.title} section={section} activeAction={activeAction} onAction={onAction} />
                ))}
            </nav>
        </aside>
    );
}

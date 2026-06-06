import type { NavSection as NavSectionType } from '@/presentation/config/navigation';
import { NavItem } from './NavItem';

interface NavSectionProps {
    section: NavSectionType;
}

export function NavSection({ section }: NavSectionProps) {
    return (
        <div className="sidebar__section">
            <span className="sidebar__section-title">{section.title}</span>
            <ul className="sidebar__section-list" role="list">
                {section.items.map((item) => (
                    <li key={item.to}>
                        <NavItem
                            label={item.label}
                            to={item.to}
                            icon={item.icon}
                            end={item.end}
                        />
                    </li>
                ))}
            </ul>
        </div>
    );
}

import type { ComponentType, SVGProps } from 'react';

import { Chat } from '@/presentation/components/atoms/Icon/Chat';
import { Database } from '@/presentation/components/atoms/Icon/Database';
import { Sessions } from '@/presentation/components/atoms/Icon/Sessions';
import { Config } from '@/presentation/components/atoms/Icon/Config';

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export const NAV_ITEM_KIND = {
    route: 'route',
    action: 'action',
} as const;

export type NavItemKind = (typeof NAV_ITEM_KIND)[keyof typeof NAV_ITEM_KIND];

export const NAV_ITEM_ACTION = {
    openConfig: 'open-config',
} as const;

export type NavItemAction = (typeof NAV_ITEM_ACTION)[keyof typeof NAV_ITEM_ACTION];

export interface NavItem {
    label: string;
    icon: IconComponent;
    kind?: NavItemKind;
    to?: string;
    action?: NavItemAction;
    end?: boolean;
    requiredRole?: string;
}

export interface NavSection {
    title: string;
    items: NavItem[];
}

export const navigationConfig: NavSection[] = [
    {
        title: 'Espacio de trabajo',
        items: [
            {
                label: 'Chat',
                kind: NAV_ITEM_KIND.route,
                to: '/',
                icon: Chat,
                end: true,
            },
        ],
    },
    {
        title: 'Datos',
        items: [
            {
                label: 'Bases de datos',
                kind: NAV_ITEM_KIND.route,
                to: '/databases',
                icon: Database,
            },
            {
                label: 'Sesiones',
                kind: NAV_ITEM_KIND.route,
                to: '/sessions',
                icon: Sessions,
            },
        ],
    },
    {
        title: 'Sistema',
        items: [
            {
                label: 'Configuración',
                kind: NAV_ITEM_KIND.action,
                action: NAV_ITEM_ACTION.openConfig,
                icon: Config,
            },
        ],
    },
];

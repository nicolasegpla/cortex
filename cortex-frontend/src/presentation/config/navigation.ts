import type { ComponentType, SVGProps } from 'react';

import { Chat } from '@/presentation/components/atoms/Icon/Chat';
import { Database } from '@/presentation/components/atoms/Icon/Database';
import { Sessions } from '@/presentation/components/atoms/Icon/Sessions';
import { Config } from '@/presentation/components/atoms/Icon/Config';
import { Admin } from '@/presentation/components/atoms/Icon/Admin';

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export interface NavItem {
    label: string;
    to: string;
    icon: IconComponent;
    end?: boolean;
    requiredRole?: string;
}

export interface NavSection {
    title: string;
    items: NavItem[];
}

export const navigationConfig: NavSection[] = [
    {
        title: 'Workspace',
        items: [
            {
                label: 'Chat',
                to: '/',
                icon: Chat,
                end: true,
            },
        ],
    },
    {
        title: 'Data',
        items: [
            {
                label: 'Cervecerías',
                to: '/breweries',
                icon: Database,
            },
            {
                label: 'Sessions',
                to: '/sessions',
                icon: Sessions,
            },
        ],
    },
    {
        title: 'System',
        items: [
            {
                label: 'Config',
                to: '/config',
                icon: Config,
            },
            {
                label: 'Admin',
                to: '/admin',
                icon: Admin,
                requiredRole: 'super_admin',
            },
        ],
    },
];

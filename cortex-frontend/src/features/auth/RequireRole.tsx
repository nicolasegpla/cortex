import { Navigate } from 'react-router-dom';

import { useAuthStore } from '@/features/auth/store';

interface RequireRoleProps {
    children: React.ReactNode;
    allowedRoles: string[];
}

export function RequireRole({ children, allowedRoles }: RequireRoleProps) {
    const { user, role, isLoading, isInitialized } = useAuthStore();

    if (isLoading || !isInitialized) {
        return <div className="loading-screen">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (role && !allowedRoles.includes(role)) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}

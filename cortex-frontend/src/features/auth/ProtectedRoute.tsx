import { Navigate } from 'react-router-dom';

import { useAuthStore } from '@/features/auth/store';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, isLoading } = useAuthStore();

    if (isLoading) {
        return (<div className="loading-screen">Loading...</div>);
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}

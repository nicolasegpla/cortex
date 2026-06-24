import { apiClient } from '@/services/api/client';
import type { AdminUser, CreateUserPayload } from '@/features/user-management/types';

export type { AdminUser, CreateUserPayload };

async function createUser(payload: CreateUserPayload): Promise<AdminUser> {
    const backendPayload = {
        email: payload.email,
        role: payload.role,
    };

    return apiClient.post<AdminUser>('/admin/users', backendPayload);
}

async function listUsers(): Promise<AdminUser[]> {
    const response = await apiClient.get<{ users: AdminUser[] }>('/admin/users');
    return response.users;
}

async function deleteUser(userId: string): Promise<void> {
    return apiClient.delete(`/admin/users/${userId}`);
}

export const adminUserApi = {
    createUser,
    listUsers,
    deleteUser,
};

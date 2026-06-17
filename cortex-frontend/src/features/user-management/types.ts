export interface CreateUserPayload {
    email: string;
    password: string;
    passwordConfirm: string;
    role: string;
}

export interface AdminUser {
    id: string;
    email: string;
    role: string;
}

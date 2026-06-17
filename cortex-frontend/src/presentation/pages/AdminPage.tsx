'use client';

import { useActionState, useCallback, useEffect, useState } from 'react';

import { Button, Input } from '@/presentation/components/atoms';
import { DeleteConfirmationModal } from '@/presentation/components/organisms';
import { adminUserApi, type AdminUser } from '@/services/adminUserApi';

interface FormState {
    success: boolean;
    message: string;
    user: AdminUser | null;
}

async function createUserAction(_prevState: FormState, formData: FormData): Promise<FormState> {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const passwordConfirm = formData.get('passwordConfirm') as string;
    const role = formData.get('role') as string;

    try {
        const user = await adminUserApi.createUser({ email, password, passwordConfirm, role });
        return { success: true, message: 'Usuario creado correctamente.', user };
    } catch (err) {
        return {
            success: false,
            message: err instanceof Error ? err.message : 'Error al crear el usuario.',
            user: null,
        };
    }
}

export function AdminPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [listError, setListError] = useState<string | null>(null);
    const [formState, formAction, isPending] = useActionState<FormState, FormData>(
        createUserAction,
        { success: false, message: '', user: null }
    );

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deleteSuccess, setDeleteSuccess] = useState(false);
    const [userIdToDelete, setUserIdToDelete] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        adminUserApi
            .listUsers()
            .then((data) => {
                if (!cancelled) {
                    setUsers(data);
                    setListError(null);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setListError(err instanceof Error ? err.message : 'Error al cargar los usuarios');
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (formState.success && formState.user) {
            setUsers((prev) => [...prev, formState.user as AdminUser]);
        }
    }, [formState]);

    const openDeleteModal = useCallback((id: string) => {
        setUserIdToDelete(id);
        setDeleteError(null);
        setDeleteSuccess(false);
        setIsDeleteModalOpen(true);
    }, []);

    const closeDeleteModal = useCallback(() => {
        if (isDeleting) {
            return;
        }
        setIsDeleteModalOpen(false);
        setUserIdToDelete(null);
        setDeleteError(null);
        setDeleteSuccess(false);
    }, [isDeleting]);

    const confirmDelete = useCallback(async () => {
        if (!userIdToDelete) {
            return;
        }

        setIsDeleting(true);
        setDeleteError(null);

        try {
            await adminUserApi.deleteUser(userIdToDelete);
            setDeleteSuccess(true);
            setIsDeleting(false);
            setUsers((prev) => prev.filter((u) => u.id !== userIdToDelete));
        } catch (err) {
            setIsDeleting(false);
            setDeleteSuccess(false);
            setDeleteError(err instanceof Error ? err.message : 'Error al eliminar el usuario');
        }
    }, [userIdToDelete]);

    const selectedUser = users.find((u) => u.id === userIdToDelete);
    const itemLabel = selectedUser ? `al usuario ${selectedUser.email}` : 'este usuario';

    return (
        <section aria-labelledby="admin-title" className="admin-page">
            <div className="page-card">
                <p className="page-card__eyebrow">Sistema</p>
                <h2 id="admin-title" className="page-card__title">
                    Administración de usuarios
                </h2>
                <p className="page-card__description">
                    Creá y gestioná los usuarios que tienen acceso a Cortex.
                </p>

                {formState.message && (
                    <div
                        className={formState.success ? 'success-message' : 'error-message'}
                        role={formState.success ? 'status' : 'alert'}
                    >
                        {formState.message}
                    </div>
                )}

                <form action={formAction} className="page-form admin-page__form">
                    <Input
                        label="Email"
                        name="email"
                        type="email"
                        placeholder="name@company.com"
                        required
                    />
                    <Input
                        label="Contraseña"
                        name="password"
                        type="password"
                        placeholder="Ingresá una contraseña"
                        required
                    />
                    <Input
                        label="Confirmar contraseña"
                        name="passwordConfirm"
                        type="password"
                        placeholder="Repetí la contraseña"
                        required
                    />
                    <Input label="Rol" name="role" placeholder="operativo" defaultValue="operativo" required />
                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'Creando...' : 'Crear usuario'}
                    </Button>
                </form>
            </div>

            <div className="page-card admin-page__list">
                <h3 className="admin-page__list-title">Usuarios</h3>

                {listError && (
                    <div className="error-message" role="alert">{listError}</div>
                )}

                {!listError && users.length === 0 ? (
                    <p className="admin-page__empty-state">No hay usuarios registrados.</p>
                ) : (
                    <ul className="admin-page__user-list" role="list">
                        {users.map((user) => (
                            <li key={user.id} className="admin-page__user-item">
                                <span className="admin-page__user-email">{user.email}</span>
                                <span className="admin-page__user-role">{user.role}</span>
                                <button
                                    type="button"
                                    className="admin-page__delete-button"
                                    onClick={() => openDeleteModal(user.id)}
                                >
                                    Eliminar
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                isDeleting={isDeleting}
                error={deleteError}
                success={deleteSuccess}
                itemLabel={itemLabel}
                onConfirm={confirmDelete}
                onCancel={closeDeleteModal}
            />
        </section>
    );
}

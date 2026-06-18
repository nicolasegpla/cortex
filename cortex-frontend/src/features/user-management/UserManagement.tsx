'use client';

import { useActionState, useCallback, useEffect, useRef, useState } from 'react';

import { Button, Input, TableLoadingRow } from '@/presentation/components/atoms';
import { DeleteConfirmationModal } from '@/presentation/components/organisms';
import { adminUserApi } from '@/services/adminUserApi';
import { getTopmostModal } from '@/shared/modalUtils';
import type { AdminUser } from './types';

import './UserManagement.scss';

interface FormState {
    success: boolean;
    message: string;
    user: AdminUser | null;
}

interface UserManagementProps {
    isCreateModalOpen?: boolean;
    onOpenCreateModal?: () => void;
    onCloseCreateModal?: () => void;
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

export function UserManagement({
    isCreateModalOpen = false,
    onOpenCreateModal,
    onCloseCreateModal,
}: UserManagementProps) {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [listError, setListError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const createModalRef = useRef<HTMLElement>(null);
    const [formState, formAction, isPending] = useActionState<FormState, FormData>(
        createUserAction,
        { success: false, message: '', user: null }
    );

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deleteSuccess, setDeleteSuccess] = useState(false);
    const [userIdToDelete, setUserIdToDelete] = useState<string | null>(null);
    const onCloseCreateModalRef = useRef(onCloseCreateModal);
    const lastCreatedUserId = useRef<string | null>(null);

    onCloseCreateModalRef.current = onCloseCreateModal;

    const closeCreateModal = useCallback(() => {
        if (isPending) {
            return;
        }
        onCloseCreateModalRef.current?.();
    }, [isPending]);

    useEffect(() => {
        let cancelled = false;

        setIsLoading(true);
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
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (formState.success && formState.user && formState.user.id !== lastCreatedUserId.current) {
            setUsers((prev) => [...prev, formState.user as AdminUser]);
            lastCreatedUserId.current = formState.user.id;
            closeCreateModal();
        }
    }, [formState, closeCreateModal]);

    useEffect(() => {
        if (!isCreateModalOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || isPending) {
                return;
            }

            const topmost = getTopmostModal();
            if (createModalRef.current && topmost !== createModalRef.current) {
                return;
            }

            closeCreateModal();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isCreateModalOpen, isPending, closeCreateModal]);

    const handleCreateBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget && !isPending) {
            closeCreateModal();
        }
    };

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
        <section aria-label="Administración de usuarios" className="user-management">
            <div className="user-management__toolbar">
                <Button type="button" onClick={onOpenCreateModal}>
                    Crear usuario
                </Button>
            </div>

            {formState.message && !isCreateModalOpen && (
                <div
                    className={formState.success ? 'success-message' : 'error-message'}
                    role={formState.success ? 'status' : 'alert'}
                >
                    {formState.message}
                </div>
            )}

            {listError && (
                <div className="error-message" role="alert">{listError}</div>
            )}

            <div className="user-management__table-wrapper">
                <table className="user-management__table">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && users.length === 0 ? (
                            <TableLoadingRow colSpan={3} message="Cargando usuarios..." />
                        ) : (
                            users.map((user) => (
                                <tr key={user.id}>
                                    <td>{user.email}</td>
                                    <td>{user.role}</td>
                                    <td>
                                        <button
                                            type="button"
                                            className="user-management__delete-button"
                                            onClick={() => openDeleteModal(user.id)}
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {!isLoading && !listError && users.length === 0 && (
                <div className="user-management__empty-state">
                    No hay usuarios registrados.
                </div>
            )}

            {isCreateModalOpen && (
                <div className="user-management__modal-layer" onClick={handleCreateBackdropClick}>
                    <section
                        ref={createModalRef}
                        className="user-management__modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-user-title"
                    >
                        <header className="user-management__modal-header">
                            <h3 id="create-user-title" className="user-management__modal-title">
                                Crear usuario
                            </h3>
                            <button
                                type="button"
                                className="user-management__modal-close"
                                aria-label="Cerrar"
                                onClick={closeCreateModal}
                            >
                                ×
                            </button>
                        </header>

                        {formState.message && (
                            <div
                                className={formState.success ? 'success-message' : 'error-message'}
                                role={formState.success ? 'status' : 'alert'}
                            >
                                {formState.message}
                            </div>
                        )}

                        <form action={formAction} className="user-management__form">
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
                            <div className="user-management__form-actions">
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? 'Creando...' : 'Crear usuario'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={closeCreateModal}
                                    disabled={isPending}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    </section>
                </div>
            )}

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

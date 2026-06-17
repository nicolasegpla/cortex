import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

import { Button } from '@/presentation/components/atoms';
import { getTopmostModal } from '@/shared/modalUtils';

import './DeleteConfirmationModal.scss';

export interface DeleteConfirmationModalProps {
    isOpen: boolean;
    isDeleting: boolean;
    error: string | null;
    success: boolean;
    itemLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function DeleteConfirmationModal({
    isOpen,
    isDeleting,
    error,
    success,
    itemLabel,
    onConfirm,
    onCancel,
}: DeleteConfirmationModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || isDeleting) {
                return;
            }

            const topmost = getTopmostModal();
            if (dialogRef.current && topmost !== dialogRef.current) {
                return;
            }

            onCancel();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isDeleting, onCancel]);

    if (!isOpen) {
        return null;
    }

    const handleBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
        if (event.target === event.currentTarget && !isDeleting) {
            onCancel();
        }
    };

    const handleDialogCancel = (event: React.SyntheticEvent<HTMLDialogElement>) => {
        if (isDeleting) {
            event.preventDefault();
            return;
        }
        onCancel();
    };

    let stateContent: ReactNode;

    if (success) {
        stateContent = (
            <div className="delete-confirmation-modal__state delete-confirmation-modal__state--success">
                <div className="delete-confirmation-modal__success-icon" aria-hidden="true">✓</div>
                <p>Eliminado correctamente</p>
            </div>
        );
    } else {
        stateContent = (
            <div className="delete-confirmation-modal__state">
                <h3>Confirmar eliminación</h3>
                {!success && error && (
                    <p role="alert" className="delete-confirmation-modal__error">{error}</p>
                )}
                {!error && (
                    <p>
                        ¿Estás seguro de eliminar <strong>{itemLabel}</strong>?
                    </p>
                )}
                {isDeleting && (
                    <div className="delete-confirmation-modal__spinner-wrapper">
                        <div className="delete-confirmation-modal__spinner" aria-hidden="true" />
                        <p>Eliminando...</p>
                    </div>
                )}
                <div className="delete-confirmation-modal__actions">
                    <Button variant="primary" onClick={onConfirm} disabled={isDeleting}>
                        Eliminar
                    </Button>
                    <Button variant="secondary" onClick={onCancel} disabled={isDeleting}>
                        Cancelar
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <dialog
            ref={dialogRef}
            className="delete-confirmation-modal"
            open
            onCancel={handleDialogCancel}
            onClick={handleBackdropClick}
            aria-modal="true"
        >
            {stateContent}
        </dialog>
    );
}

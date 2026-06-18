import { useEffect, useId, useRef } from 'react';

import { getTopmostModal } from '@/shared/modalUtils';

import './EntityFormModal.scss';

export interface EntityFormModalProps {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    isLoading: boolean;
    children: React.ReactNode;
}

export function EntityFormModal({
    isOpen,
    title,
    onClose,
    isLoading,
    children,
}: EntityFormModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const headingId = useId();

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) {
            return;
        }

        if (isOpen) {
            if (!dialog.open) {
                dialog.showModal();
            }
        } else if (dialog.open) {
            dialog.close();
        }

        return () => {
            if (dialog.open) {
                dialog.close();
            }
        };
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const handleBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    const handleDialogCancel = (event: React.SyntheticEvent<HTMLDialogElement>) => {
        const topmost = getTopmostModal();
        if (dialogRef.current && topmost !== dialogRef.current) {
            event.preventDefault();
            return;
        }

        event.preventDefault();
        onClose();
    };

    return (
        <dialog
            ref={dialogRef}
            className="entity-form-modal"
            onCancel={handleDialogCancel}
            onClick={handleBackdropClick}
            aria-modal="true"
            aria-labelledby={headingId}
            aria-busy={isLoading}
        >
            <div className="entity-form-modal__content">
                <div className="entity-form-modal__header">
                    <h3 id={headingId}>{title}</h3>
                    <button
                        type="button"
                        className="entity-form-modal__close"
                        onClick={onClose}
                        aria-label="Close form"
                        disabled={isLoading}
                    >
                        ×
                    </button>
                </div>

                <div className="entity-form-modal__body">
                    {children}
                </div>

                {isLoading && (
                    <div className="entity-form-modal__overlay" aria-hidden="true">
                        <span className="entity-form-modal__spinner" />
                        <span>Saving...</span>
                    </div>
                )}
            </div>
        </dialog>
    );
}

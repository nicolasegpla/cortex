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
    const previouslyFocusedElement = useRef<HTMLElement | null>(null);
    const wasOpen = useRef(false);

    const restoreFocus = () => {
        const element = previouslyFocusedElement.current;
        if (element?.isConnected && 'focus' in element) {
            element.focus();
        }
    };

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) {
            return;
        }

        if (isOpen) {
            if (!wasOpen.current) {
                previouslyFocusedElement.current = document.activeElement as HTMLElement;
                wasOpen.current = true;
            }
            if (!dialog.open) {
                dialog.showModal();
            }
        } else if (wasOpen.current) {
            wasOpen.current = false;
            if (dialog.open) {
                dialog.close();
            }
            restoreFocus();
        }
    }, [isOpen]);

    useEffect(() => {
        return () => {
            if (wasOpen.current) {
                wasOpen.current = false;
                restoreFocus();
            }
        };
    }, []);

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
            aria-modal={isOpen ? 'true' : undefined}
            aria-labelledby={headingId}
            aria-busy={isOpen ? isLoading : undefined}
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

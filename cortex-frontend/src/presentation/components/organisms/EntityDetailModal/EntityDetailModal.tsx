import { useEffect, useId, useRef } from 'react';

import { Button } from '@/presentation/components/atoms';
import { getTopmostModal } from '@/shared/modalUtils';

import './EntityDetailModal.scss';

export interface EntityDetailModalSection {
    heading: string;
    fields: {
        label: string;
        value: string;
    }[];
}

export interface EntityDetailModalProps {
    isOpen: boolean;
    title: string;
    sections: EntityDetailModalSection[];
    onEdit: () => void;
    onDelete: () => void;
    onClose: () => void;
}

export function EntityDetailModal({
    isOpen,
    title,
    sections,
    onEdit,
    onDelete,
    onClose,
}: EntityDetailModalProps) {
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
            className="entity-detail-modal"
            onCancel={handleDialogCancel}
            onClick={handleBackdropClick}
            aria-modal="true"
            aria-labelledby={headingId}
        >
            <div className="entity-detail-modal__content">
                <div className="entity-detail-modal__header">
                    <h3 id={headingId}>{title}</h3>
                    <button
                        type="button"
                        className="entity-detail-modal__close"
                        onClick={onClose}
                        aria-label="Cerrar detalles"
                    >
                        ×
                    </button>
                </div>

                <div className="entity-detail-modal__body">
                    {sections.map((section) => (
                        <section key={section.heading} className="entity-detail-modal__section">
                            <h4 className="entity-detail-modal__section-heading">{section.heading}</h4>
                            <dl className="entity-detail-modal__fields">
                                {section.fields.map((field) => (
                                    <div key={field.label} className="entity-detail-modal__field">
                                        <dt>{field.label}</dt>
                                        <dd>{field.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    ))}
                </div>

                <div className="entity-detail-modal__actions">
                    <Button variant="primary" onClick={onEdit}>
                        Editar
                    </Button>
                    <Button variant="secondary" onClick={onDelete}>
                        Eliminar
                    </Button>
                </div>
            </div>
        </dialog>
    );
}

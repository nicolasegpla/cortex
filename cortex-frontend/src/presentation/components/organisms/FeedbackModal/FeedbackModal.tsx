import { useEffect, useId, useRef, useState } from 'react';

import { Button, Input, Select, Textarea } from '@/presentation/components/atoms';
import { getTopmostModal } from '@/shared/modalUtils';

import './FeedbackModal.scss';

export const FEEDBACK_TYPES = {
    bug: 'bug',
    mejora: 'mejora',
    nueva_funcion: 'nueva_funcion',
    otro: 'otro',
} as const;

export type FeedbackType = (typeof FEEDBACK_TYPES)[keyof typeof FEEDBACK_TYPES];

export interface FeedbackPayload {
    type: FeedbackType;
    subject: string;
    message: string;
}

export interface FeedbackFormResult {
    success: boolean;
    message: string;
}

export interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: FeedbackPayload) => Promise<FeedbackFormResult>;
}

type FeedbackStatus = 'idle' | 'submitting' | 'success' | 'error';

interface FieldErrors {
    subject?: string;
    message?: string;
}

const TYPE_OPTIONS = [
    { value: FEEDBACK_TYPES.bug, label: 'bug' },
    { value: FEEDBACK_TYPES.mejora, label: 'mejora' },
    { value: FEEDBACK_TYPES.nueva_funcion, label: 'nueva función' },
    { value: FEEDBACK_TYPES.otro, label: 'otro' },
];

const GENERIC_ERROR_MESSAGE = 'No pudimos enviar tu feedback. Intentá nuevamente.';

export function FeedbackModal({ isOpen, onClose, onSubmit }: FeedbackModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const headingId = useId();
    const previouslyFocusedElement = useRef<HTMLElement | null>(null);
    const wasOpen = useRef(false);

    const [type, setType] = useState<FeedbackType>(FEEDBACK_TYPES.bug);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<FeedbackStatus>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    const isSubmitting = status === 'submitting';

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

    useEffect(() => {
        if (!isOpen) {
            setType(FEEDBACK_TYPES.bug);
            setSubject('');
            setMessage('');
            setStatus('idle');
            setStatusMessage('');
            setFieldErrors({});
        }
    }, [isOpen]);

    const handleDialogCancel = (event: React.SyntheticEvent<HTMLDialogElement>) => {
        const topmost = getTopmostModal();
        if (dialogRef.current && topmost !== dialogRef.current) {
            event.preventDefault();
            return;
        }

        event.preventDefault();
        if (isSubmitting) {
            return;
        }
        onClose();
    };

    const handleBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
        // Native <dialog> surfaces backdrop clicks as click events on the dialog element itself.
        // target === currentTarget means the click landed on the backdrop, not on the content.
        if (event.target === event.currentTarget && !isSubmitting) {
            onClose();
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const errors: FieldErrors = {};
        if (subject.trim().length === 0) {
            errors.subject = 'El asunto es obligatorio.';
        }
        if (message.trim().length === 0) {
            errors.message = 'El mensaje es obligatorio.';
        }
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) {
            return;
        }

        setStatus('submitting');
        setStatusMessage('');

        try {
            const result = await onSubmit({ type, subject, message });
            setStatus(result.success ? 'success' : 'error');
            setStatusMessage(result.message);
        } catch {
            setStatus('error');
            setStatusMessage(GENERIC_ERROR_MESSAGE);
        }
    };

    return (
        <dialog
            ref={dialogRef}
            className="feedback-modal"
            onCancel={handleDialogCancel}
            onClick={handleBackdropClick}
            aria-modal={isOpen ? 'true' : undefined}
            aria-labelledby={headingId}
            aria-busy={isOpen ? isSubmitting : undefined}
        >
            <div className="feedback-modal__content">
                <div className="feedback-modal__header">
                    <h3 id={headingId}>Ayuda y soporte</h3>
                    <button
                        type="button"
                        className="feedback-modal__close"
                        onClick={onClose}
                        aria-label="Cerrar formulario"
                        disabled={isSubmitting}
                    >
                        ×
                    </button>
                </div>

                {status === 'success' ? (
                    <div className="feedback-modal__success">
                        <div className="feedback-modal__success-icon" aria-hidden="true">✓</div>
                        <p role="status" className="feedback-modal__status">
                            {statusMessage}
                        </p>
                        <div className="feedback-modal__actions">
                            <Button variant="primary" onClick={onClose}>
                                Cerrar
                            </Button>
                        </div>
                    </div>
                ) : (
                    <form noValidate onSubmit={handleSubmit}>
                        <div className="feedback-modal__body">
                            <fieldset>
                                <Select
                                    label="Tipo de solicitud"
                                    name="type"
                                    value={type}
                                    options={TYPE_OPTIONS}
                                    required
                                    disabled={isSubmitting}
                                    onChange={(event) => setType(event.target.value as FeedbackType)}
                                />
                                <div>
                                    <Input
                                        label="Asunto"
                                        name="subject"
                                        value={subject}
                                        required
                                        disabled={isSubmitting}
                                        onChange={(event) => setSubject(event.target.value)}
                                    />
                                    {fieldErrors.subject && (
                                        <p role="alert" className="feedback-modal__field-error">
                                            {fieldErrors.subject}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Textarea
                                        label="Mensaje"
                                        name="message"
                                        value={message}
                                        required
                                        disabled={isSubmitting}
                                        onChange={(event) => setMessage(event.target.value)}
                                    />
                                    {fieldErrors.message && (
                                        <p role="alert" className="feedback-modal__field-error">
                                            {fieldErrors.message}
                                        </p>
                                    )}
                                </div>
                                {status === 'error' && (
                                    <p role="status" className="feedback-modal__status feedback-modal__status--error">
                                        {statusMessage}
                                    </p>
                                )}
                            </fieldset>
                        </div>

                        <div className="feedback-modal__actions">
                            <Button type="submit" variant="primary" disabled={isSubmitting}>
                                Enviar
                            </Button>
                            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                                Cancelar
                            </Button>
                        </div>
                    </form>
                )}

                {isSubmitting && (
                    <div className="feedback-modal__overlay" role="status">
                        <span className="feedback-modal__spinner" aria-hidden="true" />
                        <span>Enviando...</span>
                    </div>
                )}
            </div>
        </dialog>
    );
}

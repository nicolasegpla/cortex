import { useState } from 'react';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getTopmostModal } from '@/shared/modalUtils';

import { FeedbackModal } from './FeedbackModal';
import type { FeedbackFormResult } from './FeedbackModal';

vi.mock('@/shared/modalUtils', () => ({
    getTopmostModal: vi.fn(),
}));

const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
};

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
    await user.selectOptions(screen.getByLabelText('Tipo de solicitud'), 'bug');
    await user.type(screen.getByLabelText('Asunto'), 'Crash');
    await user.type(screen.getByLabelText('Mensaje'), 'Steps');
}

describe('FeedbackModal', () => {
    afterEach(() => {
        cleanup();
    });

    it('does not expose the dialog when isOpen is false', () => {
        render(<FeedbackModal {...baseProps} isOpen={false} />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders a dialog titled "Ayuda y soporte" with aria-modal="true" when open', () => {
        const showModalSpy = vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function (this: HTMLDialogElement) {
            this.setAttribute('open', '');
        });

        render(<FeedbackModal {...baseProps} />);

        expect(showModalSpy).toHaveBeenCalledTimes(1);
        const dialog = screen.getByRole('dialog', { name: 'Ayuda y soporte' });
        expect(dialog).toHaveAttribute('aria-modal', 'true');

        showModalSpy.mockRestore();
    });

    it('renders Tipo de solicitud, Asunto and Mensaje fields with labels', () => {
        render(<FeedbackModal {...baseProps} />);

        expect(screen.getByLabelText('Tipo de solicitud')).toBeRequired();
        expect(screen.getByLabelText('Asunto')).toBeRequired();
        expect(screen.getByLabelText('Mensaje')).toBeRequired();
    });

    it('renders all four request type options', () => {
        render(<FeedbackModal {...baseProps} />);

        expect(screen.getByRole('option', { name: 'bug' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'mejora' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'nueva función' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'otro' })).toBeInTheDocument();
        expect(screen.getAllByRole('option')).toHaveLength(4);
    });

    it('calls onClose when the close button is clicked', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        render(<FeedbackModal {...baseProps} onClose={onClose} />);

        await user.click(screen.getByRole('button', { name: 'Cerrar formulario' }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape is pressed and the dialog is topmost', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        render(<FeedbackModal {...baseProps} onClose={onClose} />);

        vi.mocked(getTopmostModal).mockReturnValue(screen.getByRole('dialog'));

        await user.keyboard('{Escape}');

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('ignores Escape when another modal is on top', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        vi.mocked(getTopmostModal).mockReturnValue(document.createElement('dialog'));

        render(<FeedbackModal {...baseProps} onClose={onClose} />);

        await user.keyboard('{Escape}');

        expect(onClose).not.toHaveBeenCalled();
    });

    it('calls onClose when the backdrop (dialog element itself) is clicked', () => {
        const onClose = vi.fn();

        render(<FeedbackModal {...baseProps} onClose={onClose} />);

        const dialog = screen.getByRole('dialog');
        fireEvent.click(dialog, { target: dialog });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when clicking inside the dialog content', () => {
        const onClose = vi.fn();

        const { container } = render(<FeedbackModal {...baseProps} onClose={onClose} />);

        const fieldset = container.querySelector('fieldset');
        expect(fieldset).not.toBeNull();
        fireEvent.click(fieldset as Element, { target: fieldset as Element });

        expect(onClose).not.toHaveBeenCalled();
    });

    it('does not call onClose when Escape is pressed while submitting', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        let resolveSubmit: (result: FeedbackFormResult) => void = () => {};
        const onSubmit = vi.fn().mockImplementation(
            () => new Promise<FeedbackFormResult>((resolve) => { resolveSubmit = resolve; })
        );

        render(<FeedbackModal {...baseProps} onClose={onClose} onSubmit={onSubmit} />);

        vi.mocked(getTopmostModal).mockReturnValue(screen.getByRole('dialog'));

        await fillValidForm(user);
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true');
        });

        await user.keyboard('{Escape}');

        expect(onClose).not.toHaveBeenCalled();

        resolveSubmit({ success: true, message: 'Gracias por tu feedback.' });
        await screen.findByText(/gracias/i);
    });

    it('shows role="alert" validation and does not call onSubmit when fields contain only whitespace', async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();

        render(<FeedbackModal {...baseProps} onSubmit={onSubmit} />);

        await user.type(screen.getByLabelText('Asunto'), '   ');
        await user.type(screen.getByLabelText('Mensaje'), '   ');
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        const alerts = screen.getAllByRole('alert');
        expect(alerts).toHaveLength(2);
        expect(alerts[0]).toHaveTextContent('El asunto es obligatorio.');
        expect(alerts[1]).toHaveTextContent('El mensaje es obligatorio.');
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows role="alert" validation and does not call onSubmit on empty submit', async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn();

        render(<FeedbackModal {...baseProps} onSubmit={onSubmit} />);

        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        const alerts = screen.getAllByRole('alert');
        expect(alerts).toHaveLength(2);
        expect(alerts[0]).toHaveTextContent('El asunto es obligatorio.');
        expect(alerts[1]).toHaveTextContent('El mensaje es obligatorio.');
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('calls onSubmit with the typed payload on valid submit', async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn().mockResolvedValue({ success: true, message: 'Gracias por tu feedback.' });

        render(<FeedbackModal {...baseProps} onSubmit={onSubmit} />);

        await fillValidForm(user);
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledWith({ type: 'bug', subject: 'Crash', message: 'Steps' });
        });
    });

    it('shows aria-busy, an "Enviando..." spinner, and disables fields while submitting', async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn().mockImplementation(() => new Promise<FeedbackFormResult>(() => {}));

        render(<FeedbackModal {...baseProps} onSubmit={onSubmit} />);

        await fillValidForm(user);
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true');
        });
        expect(screen.getByText('Enviando...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
        expect(screen.getByLabelText('Tipo de solicitud')).toBeDisabled();
        expect(screen.getByLabelText('Asunto')).toBeDisabled();
        expect(screen.getByLabelText('Mensaje')).toBeDisabled();
    });

    it('hides the form and shows a confirmation with a Cerrar button on success', async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn().mockResolvedValue({ success: true, message: 'Gracias por tu feedback.' });

        render(<FeedbackModal {...baseProps} onSubmit={onSubmit} />);

        await fillValidForm(user);
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(await screen.findByText(/gracias/i)).toBeInTheDocument();
        expect(screen.queryByLabelText('Asunto')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
    });

    it('calls onClose when the success Cerrar button is clicked', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        const onSubmit = vi.fn().mockResolvedValue({ success: true, message: 'Gracias por tu feedback.' });

        render(<FeedbackModal {...baseProps} onClose={onClose} onSubmit={onSubmit} />);

        await fillValidForm(user);
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        await user.click(await screen.findByRole('button', { name: 'Cerrar' }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows a role="status" error, preserves typed text, and re-enables submit on failure', async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn().mockResolvedValue({ success: false, message: 'Error de red' });

        render(<FeedbackModal {...baseProps} onSubmit={onSubmit} />);

        await user.type(screen.getByLabelText('Asunto'), 'Test subject');
        await user.type(screen.getByLabelText('Mensaje'), 'Test message');
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(await screen.findByRole('status')).toHaveTextContent('Error de red');
        expect(screen.getByLabelText('Asunto')).toHaveValue('Test subject');
        expect(screen.getByRole('button', { name: 'Enviar' })).not.toBeDisabled();
    });

    it('shows a generic role="status" error, preserves typed text, and re-enables submit when onSubmit rejects', async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn().mockRejectedValue(new Error('network down'));

        render(<FeedbackModal {...baseProps} onSubmit={onSubmit} />);

        await user.type(screen.getByLabelText('Asunto'), 'Test subject');
        await user.type(screen.getByLabelText('Mensaje'), 'Test message');
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(await screen.findByRole('status')).toHaveTextContent(
            'No pudimos enviar tu feedback. Intentá nuevamente.'
        );
        expect(screen.getByLabelText('Asunto')).toHaveValue('Test subject');
        expect(screen.getByLabelText('Mensaje')).toHaveValue('Test message');
        expect(screen.getByRole('button', { name: 'Enviar' })).not.toBeDisabled();
    });

    it('resets to a fresh idle form after a successful submit, close, and reopen', async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn().mockResolvedValue({ success: true, message: 'Gracias por tu feedback.' });

        function Harness() {
            const [open, setOpen] = useState(true);
            return (
                <>
                    <button type="button" onClick={() => setOpen(true)}>
                        reopen
                    </button>
                    <FeedbackModal isOpen={open} onClose={() => setOpen(false)} onSubmit={onSubmit} />
                </>
            );
        }

        render(<Harness />);

        await fillValidForm(user);
        await user.click(screen.getByRole('button', { name: 'Enviar' }));
        expect(await screen.findByText(/gracias/i)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Cerrar' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'reopen' }));

        expect(screen.getByRole('dialog', { name: 'Ayuda y soporte' })).toBeInTheDocument();
        expect(screen.getByLabelText('Tipo de solicitud')).toHaveValue('bug');
        expect(screen.getByLabelText('Asunto')).toHaveValue('');
        expect(screen.getByLabelText('Mensaje')).toHaveValue('');
        expect(screen.queryByText(/gracias/i)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled();
    });

    it('re-runs validation and submits successfully after correcting empty fields in the same instance', async () => {
        const user = userEvent.setup();
        const onSubmit = vi.fn().mockResolvedValue({ success: true, message: 'Gracias por tu feedback.' });

        render(<FeedbackModal {...baseProps} onSubmit={onSubmit} />);

        await user.click(screen.getByRole('button', { name: 'Enviar' }));
        expect(screen.getAllByRole('alert')).toHaveLength(2);
        expect(onSubmit).not.toHaveBeenCalled();

        await user.type(screen.getByLabelText('Asunto'), 'Crash');
        await user.type(screen.getByLabelText('Mensaje'), 'Steps');
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledWith({ type: 'bug', subject: 'Crash', message: 'Steps' });
        });
        expect(await screen.findByText(/gracias/i)).toBeInTheDocument();
        expect(screen.queryAllByRole('alert')).toHaveLength(0);
    });

    it('calls onClose when Cancelar is clicked', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        render(<FeedbackModal {...baseProps} onClose={onClose} />);

        await user.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});

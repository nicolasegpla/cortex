import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DeleteConfirmationModal } from './DeleteConfirmationModal';

describe('DeleteConfirmationModal', () => {
    afterEach(() => {
        cleanup();
    });

    const baseProps = {
        isOpen: true,
        isDeleting: false,
        error: null,
        success: false,
        itemLabel: 'Test Item',
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
    };

    it('renders the confirmation state when open and idle', () => {
        render(<DeleteConfirmationModal {...baseProps} />);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/¿Estás seguro de eliminar/)).toBeInTheDocument();
        expect(screen.getByText('Test Item')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
        render(<DeleteConfirmationModal {...baseProps} isOpen={false} />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders the deleting state and disables actions', () => {
        render(<DeleteConfirmationModal {...baseProps} isDeleting={true} />);

        expect(screen.getByText('Eliminando...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    });

    it('renders an explicit error inside the modal and keeps actions enabled', () => {
        render(<DeleteConfirmationModal {...baseProps} error="No tiene permiso para eliminar" />);

        expect(screen.getByRole('alert')).toHaveTextContent('No tiene permiso para eliminar');
        expect(screen.getByRole('button', { name: 'Eliminar' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled();
    });

    it('renders the success state', () => {
        render(<DeleteConfirmationModal {...baseProps} success={true} />);

        expect(screen.getByText('Eliminado correctamente')).toBeInTheDocument();
    });

    it('calls onConfirm when the delete button is clicked', async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();

        render(<DeleteConfirmationModal {...baseProps} onConfirm={onConfirm} />);

        await user.click(screen.getByRole('button', { name: 'Eliminar' }));

        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when the cancel button is clicked', async () => {
        const user = userEvent.setup();
        const onCancel = vi.fn();

        render(<DeleteConfirmationModal {...baseProps} onCancel={onCancel} />);

        await user.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when the Escape key is pressed', async () => {
        const user = userEvent.setup();
        const onCancel = vi.fn();

        render(<DeleteConfirmationModal {...baseProps} onCancel={onCancel} />);

        await user.keyboard('{Escape}');

        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when the backdrop is clicked', async () => {
        const user = userEvent.setup();
        const onCancel = vi.fn();

        render(<DeleteConfirmationModal {...baseProps} onCancel={onCancel} />);

        await user.click(screen.getByRole('dialog'));

        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('ignores Escape while deletion is in progress', async () => {
        const user = userEvent.setup();
        const onCancel = vi.fn();

        render(<DeleteConfirmationModal {...baseProps} isDeleting={true} onCancel={onCancel} />);

        await user.keyboard('{Escape}');

        expect(onCancel).not.toHaveBeenCalled();
    });

    it('ignores backdrop clicks while deletion is in progress', async () => {
        const user = userEvent.setup();
        const onCancel = vi.fn();

        render(<DeleteConfirmationModal {...baseProps} isDeleting={true} onCancel={onCancel} />);

        await user.click(screen.getByRole('dialog'));

        expect(onCancel).not.toHaveBeenCalled();
    });

    it('ignores native dialog cancel events while deletion is in progress', () => {
        const onCancel = vi.fn();

        render(<DeleteConfirmationModal {...baseProps} isDeleting={true} onCancel={onCancel} />);

        fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }));

        expect(onCancel).not.toHaveBeenCalled();
    });
});

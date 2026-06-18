import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getTopmostModal } from '@/shared/modalUtils';

import { EntityDetailModal } from './EntityDetailModal';

vi.mock('@/shared/modalUtils', () => ({
    getTopmostModal: vi.fn(),
}));

const mockSections = [
    {
        heading: 'Identification',
        fields: [
            { label: 'Commercial Name', value: 'Viñedo Real' },
            { label: 'Legal Name', value: 'Viñedo Real S.A.S.' },
        ],
    },
    {
        heading: 'Location',
        fields: [
            { label: 'City', value: 'Medellín' },
            { label: 'Country', value: 'Colombia' },
        ],
    },
];

const baseProps = {
    isOpen: true,
    title: 'Producer Details',
    sections: mockSections,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onClose: vi.fn(),
};

describe('EntityDetailModal', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders all section headings and field values when open', () => {
        const showModalSpy = vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function (this: HTMLDialogElement) {
            this.setAttribute('open', '');
        });

        render(<EntityDetailModal {...baseProps} />);

        expect(showModalSpy).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Producer Details')).toBeInTheDocument();
        expect(screen.getByText('Identification')).toBeInTheDocument();
        expect(screen.getByText('Commercial Name')).toBeInTheDocument();
        expect(screen.getByText('Viñedo Real')).toBeInTheDocument();
        expect(screen.getByText('Location')).toBeInTheDocument();
        expect(screen.getByText('Medellín')).toBeInTheDocument();

        showModalSpy.mockRestore();
    });

    it('does not render when isOpen is false', () => {
        render(<EntityDetailModal {...baseProps} isOpen={false} />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('calls onEdit when the edit button is clicked', async () => {
        const user = userEvent.setup();
        const onEdit = vi.fn();

        render(<EntityDetailModal {...baseProps} onEdit={onEdit} />);

        await user.click(screen.getByRole('button', { name: 'Editar' }));

        expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('calls onDelete when the delete button is clicked', async () => {
        const user = userEvent.setup();
        const onDelete = vi.fn();

        render(<EntityDetailModal {...baseProps} onDelete={onDelete} />);

        await user.click(screen.getByRole('button', { name: 'Eliminar' }));

        expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the close button is clicked', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        render(<EntityDetailModal {...baseProps} onClose={onClose} />);

        await user.click(screen.getByRole('button', { name: 'Cerrar detalles' }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the Escape key is pressed', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        render(<EntityDetailModal {...baseProps} onClose={onClose} />);

        vi.mocked(getTopmostModal).mockReturnValue(screen.getByRole('dialog'));

        await user.keyboard('{Escape}');

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the backdrop is clicked', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        render(<EntityDetailModal {...baseProps} onClose={onClose} />);

        await user.click(screen.getByRole('dialog'));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('exposes aria-modal="true" on the dialog', () => {
        render(<EntityDetailModal {...baseProps} />);

        expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('ignores Escape when another modal is on top', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        const { getTopmostModal } = await import('@/shared/modalUtils');
        vi.mocked(getTopmostModal).mockReturnValue(document.createElement('dialog'));

        render(<EntityDetailModal {...baseProps} onClose={onClose} />);

        await user.keyboard('{Escape}');

        expect(onClose).not.toHaveBeenCalled();
    });
});

import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getTopmostModal } from '@/shared/modalUtils';

import { EntityFormModal } from './EntityFormModal';

vi.mock('@/shared/modalUtils', () => ({
    getTopmostModal: vi.fn(),
}));

const baseProps = {
    isOpen: true,
    title: 'Create Brewery',
    onClose: vi.fn(),
    isLoading: false,
    children: <form aria-label="Brewery form">Form content</form>,
};

describe('EntityFormModal', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders title and children when open', () => {
        const showModalSpy = vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function (this: HTMLDialogElement) {
            this.setAttribute('open', '');
        });

        render(<EntityFormModal {...baseProps} />);

        expect(showModalSpy).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Create Brewery' })).toBeInTheDocument();
        expect(screen.getByRole('form', { name: 'Brewery form' })).toBeInTheDocument();

        showModalSpy.mockRestore();
    });

    it('does not render when isOpen is false', () => {
        render(<EntityFormModal {...baseProps} isOpen={false} />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('calls onClose when the close button is clicked', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        render(<EntityFormModal {...baseProps} onClose={onClose} />);

        await user.click(screen.getByRole('button', { name: 'Close form' }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the Escape key is pressed', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        render(<EntityFormModal {...baseProps} onClose={onClose} />);

        vi.mocked(getTopmostModal).mockReturnValue(screen.getByRole('dialog'));

        await user.keyboard('{Escape}');

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the backdrop is clicked', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        render(<EntityFormModal {...baseProps} onClose={onClose} />);

        await user.click(screen.getByRole('dialog'));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('ignores Escape when another modal is on top', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        vi.mocked(getTopmostModal).mockReturnValue(document.createElement('dialog'));

        render(<EntityFormModal {...baseProps} onClose={onClose} />);

        await user.keyboard('{Escape}');

        expect(onClose).not.toHaveBeenCalled();
    });

    it('exposes aria-modal="true" on the dialog', () => {
        render(<EntityFormModal {...baseProps} />);

        expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('marks the dialog as busy and shows a loading indicator when isLoading is true', () => {
        render(<EntityFormModal {...baseProps} isLoading />);

        expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true');
        expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('does not show a loading indicator when isLoading is false', () => {
        render(<EntityFormModal {...baseProps} />);

        expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'false');
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
    });
});

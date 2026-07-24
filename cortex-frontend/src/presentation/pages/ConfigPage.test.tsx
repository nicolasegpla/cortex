import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { useAuthStore } from '@/features/auth/store';

import { ConfigPage } from './ConfigPage';

vi.mock('@/features/auth/store', async () => {
    const actual = await vi.importActual('@/features/auth/store');
    return {
        ...actual,
        useAuthStore: vi.fn(),
    };
});

const mockUseAuthStore = vi.mocked(useAuthStore);

const mockListUsers = vi.fn();
const mockCreateUser = vi.fn();
const mockDeleteUser = vi.fn();

vi.mock('@/services/adminUserApi', () => ({
    adminUserApi: {
        listUsers: () => mockListUsers(),
        createUser: (...args: unknown[]) => mockCreateUser(...args),
        deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
    },
}));

const mockSubmitFeedback = vi.fn();

vi.mock('@/services/supportApi', () => ({
    submitFeedback: (...args: unknown[]) => mockSubmitFeedback(...args),
    supportApi: {
        submitFeedback: (...args: unknown[]) => mockSubmitFeedback(...args),
    },
}));

describe('ConfigPage', () => {
    beforeEach(() => {
        mockListUsers.mockResolvedValue([]);
        mockSubmitFeedback.mockReset();
    });

    afterEach(() => {
        cleanup();
    });

    function setAuth(role: string) {
        mockUseAuthStore.mockReturnValue({
            user: { id: 'user-1', email: 'user@example.com' },
            session: { access_token: 'token' },
            role,
            isLoading: false,
            isInitialized: true,
            login: vi.fn(),
            logout: vi.fn(),
            setLoading: vi.fn(),
            setSession: vi.fn(),
            initialize: vi.fn(),
        });
    }

    it('should show only the Usuarios tab for super_admin users', () => {
        setAuth('super_admin');

        render(<ConfigPage />);

        expect(screen.getByRole('button', { name: 'Usuarios' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Proveedores de modelos' })).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Administración de usuarios' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /invitar usuario/i })).toBeInTheDocument();
    });

    it('should hide the nav sidebar and render content directly for non-admin users', () => {
        setAuth('operativo');

        const { container } = render(<ConfigPage />);

        expect(screen.queryByLabelText('Secciones de configuración')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Usuarios' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Proveedores de modelos' })).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Administración de usuarios' })).toBeInTheDocument();
        expect(container.querySelector('.config-page__body--no-nav')).toBeInTheDocument();
    });

    it('keeps a valid accessible name in the modal variant', () => {
        setAuth('super_admin');

        render(<ConfigPage variant="modal" />);

        expect(screen.getByRole('dialog', { name: 'Administración de usuarios' })).toBeInTheDocument();
    });

    it('renders "Ayuda y soporte" as a button with accessible name', () => {
        setAuth('super_admin');

        render(<ConfigPage />);

        expect(screen.getByRole('button', { name: 'Abrir ayuda y soporte' })).toBeInTheDocument();
    });

    it('does not hide the support entry from assistive technology', () => {
        setAuth('super_admin');

        const { container } = render(<ConfigPage />);

        expect(
            container.querySelector('.config-page__nav-footer[aria-hidden]'),
        ).not.toBeInTheDocument();
    });

    it('flips aria-expanded to true when the support entry is clicked', async () => {
        const user = userEvent.setup();
        setAuth('super_admin');

        render(<ConfigPage />);

        const button = screen.getByRole('button', { name: 'Abrir ayuda y soporte' });
        expect(button).toHaveAttribute('aria-expanded', 'false');

        await user.click(button);

        expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('flips aria-expanded to true on Enter and Space keyboard activation', async () => {
        const user = userEvent.setup();
        setAuth('super_admin');

        const { unmount } = render(<ConfigPage />);

        const button = screen.getByRole('button', { name: 'Abrir ayuda y soporte' });
        button.focus();
        expect(button).toHaveFocus();
        await user.type(button, '{Enter}');

        expect(button).toHaveAttribute('aria-expanded', 'true');

        unmount();

        render(<ConfigPage />);

        const freshButton = screen.getByRole('button', { name: 'Abrir ayuda y soporte' });
        freshButton.focus();
        expect(freshButton).toHaveFocus();
        await user.type(freshButton, ' ');

        expect(freshButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('reaches the support entry via Tab traversal and activates it with Enter', async () => {
        const user = userEvent.setup();
        setAuth('super_admin');

        render(<ConfigPage />);

        const button = screen.getByRole('button', { name: 'Abrir ayuda y soporte' });

        for (let i = 0; i < 10 && document.activeElement !== button; i += 1) {
            await user.tab();
        }

        expect(button).toHaveFocus();

        await user.keyboard('{Enter}');

        expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('keeps the support entry as the last nav child with composed classes', () => {
        setAuth('super_admin');

        const { container } = render(<ConfigPage />);

        const footer = container.querySelector('.config-page__nav-footer.config-page__nav-item');
        expect(footer).toBeInTheDocument();

        const nav = container.querySelector('aside.config-page__nav');
        expect(nav?.lastElementChild).toBe(footer);
    });

    it('keeps the parent modal open when the nested create-user modal opens', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();

        setAuth('super_admin');

        render(<ConfigPage variant="modal" onClose={onClose} />);

        await user.click(screen.getByRole('button', { name: /invitar usuario/i }));

        expect(screen.getByRole('dialog', { name: /administración de usuarios/i })).toBeInTheDocument();
        expect(screen.getByRole('dialog', { name: /invitar usuario/i })).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('opens the feedback modal when the support entry is clicked', async () => {
        const user = userEvent.setup();
        setAuth('super_admin');

        render(<ConfigPage />);

        await user.click(screen.getByRole('button', { name: 'Abrir ayuda y soporte' }));

        expect(screen.getByRole('dialog', { name: 'Ayuda y soporte' })).toBeInTheDocument();
    });

    it('closes the feedback modal and resets it to a fresh idle form on the next open', async () => {
        const user = userEvent.setup();
        setAuth('super_admin');

        render(<ConfigPage />);

        await user.click(screen.getByRole('button', { name: 'Abrir ayuda y soporte' }));
        expect(screen.getByRole('dialog', { name: 'Ayuda y soporte' })).toBeInTheDocument();

        await user.type(screen.getByLabelText('Asunto'), 'Draft subject');

        await user.click(screen.getByRole('button', { name: 'Cerrar formulario' }));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Abrir ayuda y soporte' }));

        expect(screen.getByRole('dialog', { name: 'Ayuda y soporte' })).toBeInTheDocument();
        expect(screen.getByLabelText('Asunto')).toHaveValue('');
        expect(screen.getByLabelText('Mensaje')).toHaveValue('');
        expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled();
    });

    it('closes only the feedback modal on Escape when it is nested above the create-user modal', async () => {
        const user = userEvent.setup();
        setAuth('super_admin');

        render(<ConfigPage />);

        await user.click(screen.getByRole('button', { name: /invitar usuario/i }));
        await user.click(screen.getByRole('button', { name: 'Abrir ayuda y soporte' }));

        expect(screen.getByRole('dialog', { name: /invitar usuario/i })).toBeInTheDocument();
        expect(screen.getByRole('dialog', { name: 'Ayuda y soporte' })).toBeInTheDocument();

        await user.keyboard('{Escape}');

        expect(screen.queryByRole('dialog', { name: 'Ayuda y soporte' })).not.toBeInTheDocument();
        expect(screen.getByRole('dialog', { name: /invitar usuario/i })).toBeInTheDocument();
    });

    it('wires the feedback modal to the real supportApi service and shows the success result', async () => {
        const user = userEvent.setup();
        setAuth('super_admin');
        mockSubmitFeedback.mockResolvedValue({ success: true, message: 'Mensaje enviado correctamente' });

        render(<ConfigPage />);

        await user.click(screen.getByRole('button', { name: 'Abrir ayuda y soporte' }));
        await user.type(screen.getByLabelText('Asunto'), 'Crash al guardar');
        await user.type(screen.getByLabelText('Mensaje'), 'Pasos para reproducir');
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(mockSubmitFeedback).toHaveBeenCalledTimes(1);
        expect(mockSubmitFeedback).toHaveBeenCalledWith({
            type: 'bug',
            subject: 'Crash al guardar',
            message: 'Pasos para reproducir',
        });
        expect(await screen.findByRole('status')).toHaveTextContent('Mensaje enviado correctamente');
    });

    it('shows the error result and preserves the typed form values when the submit fails', async () => {
        const user = userEvent.setup();
        setAuth('super_admin');
        mockSubmitFeedback.mockResolvedValue({ success: false, message: 'Error de red' });

        render(<ConfigPage />);

        await user.click(screen.getByRole('button', { name: 'Abrir ayuda y soporte' }));
        await user.type(screen.getByLabelText('Asunto'), 'Crash al guardar');
        await user.type(screen.getByLabelText('Mensaje'), 'Pasos para reproducir');
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(mockSubmitFeedback).toHaveBeenCalledTimes(1);
        expect(await screen.findByRole('status')).toHaveTextContent('Error de red');
        expect(screen.getByLabelText('Asunto')).toHaveValue('Crash al guardar');
        expect(screen.getByLabelText('Mensaje')).toHaveValue('Pasos para reproducir');
    });
});

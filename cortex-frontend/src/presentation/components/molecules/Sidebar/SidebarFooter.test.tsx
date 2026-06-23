import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/features/auth/store';

const mockNavigate = vi.fn();
const mockSignOut = vi.hoisted(() => vi.fn());
const mockAuthConfig = vi.hoisted(() => ({ authAvailable: true }));
const mockAlert = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...(actual as object), useNavigate: () => mockNavigate };
});

vi.mock('@/services/supabase/client', () => ({
    supabaseClient: {
        get auth() {
            return mockAuthConfig.authAvailable ? { signOut: () => mockSignOut() } : undefined;
        },
    },
}));

const mockUsePWAInstall = vi.hoisted(() =>
    vi.fn(() => ({
        isInstallable: false,
        isInstalled: false,
        isManualInstallEligible: false,
        promptInstall: vi.fn(),
    })),
);

vi.mock('@/services/pwa/usePWAInstall', () => ({
    usePWAInstall: mockUsePWAInstall,
}));

import { SidebarFooter } from './SidebarFooter';

describe('SidebarFooter', () => {
    beforeEach(() => {
        cleanup();
        mockNavigate.mockClear();
        mockSignOut.mockClear();
        mockAlert.mockClear();
        mockAuthConfig.authAvailable = true;
        vi.stubGlobal('alert', mockAlert);
        useAuthStore.setState({
            user: null,
            session: null,
            role: null,
            isLoading: false,
            isInitialized: false,
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('renders the user email and role when a user is present', () => {
        useAuthStore.setState({
            user: { id: '1', email: 'leia@cortex.ai' },
            role: 'super_admin',
        });

        render(
            <MemoryRouter>
                <SidebarFooter collapsed={false} />
            </MemoryRouter>
        );

        expect(screen.getByText('leia@cortex.ai')).toBeInTheDocument();
        expect(screen.getByText('super_admin')).toBeInTheDocument();
    });

    it('renders nothing when the user is null', () => {
        render(
            <MemoryRouter>
                <SidebarFooter collapsed={false} />
            </MemoryRouter>
        );

        expect(screen.queryByRole('button', { name: /cerrar sesión/i })).not.toBeInTheDocument();
    });

    it('clears auth state, calls Supabase signOut, and navigates to /login when logout succeeds', async () => {
        mockSignOut.mockResolvedValueOnce({ error: null });

        useAuthStore.setState({
            user: { id: '2', email: 'luke@cortex.ai' },
            session: { access_token: 'token-123' },
            role: 'operativo',
        });

        render(
            <MemoryRouter>
                <SidebarFooter collapsed={false} />
            </MemoryRouter>
        );

        const user = (await import('@testing-library/user-event')).default.setup();
        await user.click(screen.getByRole('button', { name: /cerrar sesión/i }));

        expect(mockSignOut).toHaveBeenCalledOnce();
        expect(useAuthStore.getState().user).toBeNull();
        expect(useAuthStore.getState().session).toBeNull();
        expect(useAuthStore.getState().role).toBeNull();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
        expect(mockAlert).not.toHaveBeenCalled();
    });

    it('keeps auth state and surfaces an alert when logout returns an error', async () => {
        mockSignOut.mockResolvedValueOnce({ error: new Error('sign out failed') });

        useAuthStore.setState({
            user: { id: '2', email: 'luke@cortex.ai' },
            session: { access_token: 'token-123' },
            role: 'operativo',
        });

        render(
            <MemoryRouter>
                <SidebarFooter collapsed={false} />
            </MemoryRouter>
        );

        const user = (await import('@testing-library/user-event')).default.setup();
        await user.click(screen.getByRole('button', { name: /cerrar sesión/i }));

        expect(mockSignOut).toHaveBeenCalledOnce();
        expect(useAuthStore.getState().user).not.toBeNull();
        expect(useAuthStore.getState().session).not.toBeNull();
        expect(useAuthStore.getState().role).not.toBeNull();
        expect(mockNavigate).not.toHaveBeenCalled();
        expect(mockAlert).toHaveBeenCalledWith('Logout failed. Please try again.');
    });

    it('keeps auth state and surfaces an alert when logout throws', async () => {
        mockSignOut.mockRejectedValueOnce(new Error('network error'));

        useAuthStore.setState({
            user: { id: '2', email: 'luke@cortex.ai' },
            session: { access_token: 'token-123' },
            role: 'operativo',
        });

        render(
            <MemoryRouter>
                <SidebarFooter collapsed={false} />
            </MemoryRouter>
        );

        const user = (await import('@testing-library/user-event')).default.setup();
        await user.click(screen.getByRole('button', { name: /cerrar sesión/i }));

        expect(mockSignOut).toHaveBeenCalledOnce();
        expect(useAuthStore.getState().user).not.toBeNull();
        expect(useAuthStore.getState().session).not.toBeNull();
        expect(useAuthStore.getState().role).not.toBeNull();
        expect(mockNavigate).not.toHaveBeenCalled();
        expect(mockAlert).toHaveBeenCalledWith('Logout failed. Please try again.');
    });

    it('keeps auth state and surfaces an alert when supabaseClient.auth is unavailable', async () => {
        mockAuthConfig.authAvailable = false;

        useAuthStore.setState({
            user: { id: '2', email: 'luke@cortex.ai' },
            session: { access_token: 'token-123' },
            role: 'operativo',
        });

        render(
            <MemoryRouter>
                <SidebarFooter collapsed={false} />
            </MemoryRouter>
        );

        const user = (await import('@testing-library/user-event')).default.setup();
        await user.click(screen.getByRole('button', { name: /cerrar sesión/i }));

        expect(mockSignOut).not.toHaveBeenCalled();
        expect(useAuthStore.getState().user).not.toBeNull();
        expect(useAuthStore.getState().session).not.toBeNull();
        expect(useAuthStore.getState().role).not.toBeNull();
        expect(mockNavigate).not.toHaveBeenCalled();
        expect(mockAlert).toHaveBeenCalledWith('Logout failed. Please try again.');
    });

    it('hides identity text but keeps the logout control accessible in collapsed mode', () => {
        useAuthStore.setState({
            user: { id: '3', email: 'han@cortex.ai' },
            role: 'operativo',
        });

        render(
            <MemoryRouter>
                <SidebarFooter collapsed={true} />
            </MemoryRouter>
        );

        expect(screen.queryByText('han@cortex.ai')).not.toBeInTheDocument();
        expect(screen.queryByText('operativo')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cerrar sesión/i })).toBeInTheDocument();
    });

    it('keeps a long email contained with ellipsis styling', () => {
        const longEmail = 'very.long.user.email.that.exceeds.available.width@cortex.ai';
        useAuthStore.setState({
            user: { id: '4', email: longEmail },
            role: 'admin',
        });

        render(
            <MemoryRouter>
                <SidebarFooter collapsed={false} />
            </MemoryRouter>
        );

        const emailElement = screen.getByText(longEmail);
        expect(emailElement).toHaveStyle({ textOverflow: 'ellipsis' });
    });
});

describe('SidebarFooter install button', () => {
    const mockPromptInstall = vi.fn();

    beforeEach(() => {
        cleanup();
        mockPromptInstall.mockClear();
        mockUsePWAInstall.mockReturnValue({
            isInstallable: false,
            isInstalled: false,
            isManualInstallEligible: false,
            promptInstall: mockPromptInstall,
        });
        useAuthStore.setState({
            user: { id: '1', email: 'user@cortex.ai' },
            role: 'super_admin',
            session: null,
            isLoading: false,
            isInitialized: false,
        });
    });

    it('does not render the install button when installation is unavailable', () => {
        render(
            <MemoryRouter>
                <SidebarFooter collapsed={false} />
            </MemoryRouter>
        );

        expect(screen.queryByRole('button', { name: /instalar aplicación/i })).not.toBeInTheDocument();
    });

    it('renders the install button when the app can be installed', () => {
        mockUsePWAInstall.mockReturnValue({
            isInstallable: true,
            isInstalled: false,
            isManualInstallEligible: false,
            promptInstall: mockPromptInstall,
        });

        render(
            <MemoryRouter>
                <SidebarFooter collapsed={false} />
            </MemoryRouter>
        );

        expect(screen.getByRole('button', { name: /instalar aplicación/i })).toBeInTheDocument();
    });

    it('hides the install button after the app has been installed', () => {
        mockUsePWAInstall.mockReturnValue({
            isInstallable: false,
            isInstalled: true,
            isManualInstallEligible: false,
            promptInstall: mockPromptInstall,
        });

        render(
            <MemoryRouter>
                <SidebarFooter collapsed={false} />
            </MemoryRouter>
        );

        expect(screen.queryByRole('button', { name: /instalar aplicación/i })).not.toBeInTheDocument();
    });

    it('triggers the install prompt when the button is clicked', async () => {
        mockUsePWAInstall.mockReturnValue({
            isInstallable: true,
            isInstalled: false,
            isManualInstallEligible: false,
            promptInstall: mockPromptInstall,
        });

        render(
            <MemoryRouter>
                <SidebarFooter collapsed={false} />
            </MemoryRouter>
        );

        const user = (await import('@testing-library/user-event')).default.setup();
        await user.click(screen.getByRole('button', { name: /instalar aplicación/i }));

        expect(mockPromptInstall).toHaveBeenCalledOnce();
    });

    it('keeps the install button accessible in collapsed mode', () => {
        mockUsePWAInstall.mockReturnValue({
            isInstallable: true,
            isInstalled: false,
            isManualInstallEligible: false,
            promptInstall: mockPromptInstall,
        });

        render(
            <MemoryRouter>
                <SidebarFooter collapsed={true} />
            </MemoryRouter>
        );

        expect(screen.getByRole('button', { name: /instalar aplicación/i })).toBeInTheDocument();
    });
});

describe('SidebarFooter iOS fallback hint', () => {
    const mockPromptInstall = vi.fn();

    beforeEach(() => {
        cleanup();
        mockPromptInstall.mockClear();
        mockUsePWAInstall.mockReturnValue({
            isInstallable: false,
            isInstalled: false,
            isManualInstallEligible: false,
            promptInstall: mockPromptInstall,
        });
        useAuthStore.setState({
            user: { id: '1', email: 'user@cortex.ai' },
            role: 'super_admin',
            session: null,
            isLoading: false,
            isInitialized: false,
        });
    });

    it('does not render the iOS fallback when manual install is not eligible', () => {
        render(
            <MemoryRouter>
                <SidebarFooter collapsed={false} />
            </MemoryRouter>
        );

        expect(screen.queryByRole('button', { name: /mostrar instrucciones de instalación/i })).not.toBeInTheDocument();
    });

    it('does not render the iOS fallback when the native install prompt is available', () => {
        mockUsePWAInstall.mockReturnValue({
            isInstallable: true,
            isInstalled: false,
            isManualInstallEligible: true,
            promptInstall: mockPromptInstall,
        });

        render(
            <MemoryRouter>
                <SidebarFooter collapsed={false} />
            </MemoryRouter>
        );

        expect(screen.queryByRole('button', { name: /mostrar instrucciones de instalación/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /instalar aplicación/i })).toBeInTheDocument();
    });

    it('does not render the iOS fallback when the app is already installed', () => {
        mockUsePWAInstall.mockReturnValue({
            isInstallable: false,
            isInstalled: true,
            isManualInstallEligible: true,
            promptInstall: mockPromptInstall,
        });

        render(
            <MemoryRouter>
                <SidebarFooter collapsed={false} />
            </MemoryRouter>
        );

        expect(screen.queryByRole('button', { name: /mostrar instrucciones de instalación/i })).not.toBeInTheDocument();
    });

    it('renders the iOS fallback button when manual install is eligible and native prompt is unavailable', () => {
        mockUsePWAInstall.mockReturnValue({
            isInstallable: false,
            isInstalled: false,
            isManualInstallEligible: true,
            promptInstall: mockPromptInstall,
        });

        render(
            <MemoryRouter>
                <SidebarFooter collapsed={false} />
            </MemoryRouter>
        );

        expect(screen.getByRole('button', { name: /mostrar instrucciones de instalación/i })).toBeInTheDocument();
    });

    it('shows the install hint when the iOS fallback button is clicked', async () => {
        mockUsePWAInstall.mockReturnValue({
            isInstallable: false,
            isInstalled: false,
            isManualInstallEligible: true,
            promptInstall: mockPromptInstall,
        });

        render(
            <MemoryRouter>
                <SidebarFooter collapsed={false} />
            </MemoryRouter>
        );

        const user = (await import('@testing-library/user-event')).default.setup();
        await user.click(screen.getByRole('button', { name: /mostrar instrucciones de instalación/i }));

        expect(screen.getByRole('tooltip')).toHaveTextContent( /compartir en safari/i);
    });

    it('hides the install hint when the iOS fallback button loses focus', async () => {
        mockUsePWAInstall.mockReturnValue({
            isInstallable: false,
            isInstalled: false,
            isManualInstallEligible: true,
            promptInstall: mockPromptInstall,
        });

        render(
            <MemoryRouter>
                <SidebarFooter collapsed={false} />
            </MemoryRouter>
        );

        const user = (await import('@testing-library/user-event')).default.setup();
        const button = screen.getByRole('button', { name: /mostrar instrucciones de instalación/i });

        await user.click(button);
        expect(screen.getByRole('tooltip')).toBeInTheDocument();

        await user.tab();
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('keeps the iOS fallback button accessible in collapsed mode', () => {
        mockUsePWAInstall.mockReturnValue({
            isInstallable: false,
            isInstalled: false,
            isManualInstallEligible: true,
            promptInstall: mockPromptInstall,
        });

        render(
            <MemoryRouter>
                <SidebarFooter collapsed={true} />
            </MemoryRouter>
        );

        expect(screen.getByRole('button', { name: /mostrar instrucciones de instalación/i })).toBeInTheDocument();
    });
});

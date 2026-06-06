import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('useSidebarStore', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.resetModules();
    });

    it('should initialize with collapsed false', async () => {
        const { useSidebarStore } = await import('./useSidebarStore');
        const state = useSidebarStore.getState();
        expect(state.collapsed).toBe(false);
    });

    it('should toggle collapsed state', async () => {
        const { useSidebarStore } = await import('./useSidebarStore');
        const { toggle } = useSidebarStore.getState();

        toggle();
        expect(useSidebarStore.getState().collapsed).toBe(true);

        toggle();
        expect(useSidebarStore.getState().collapsed).toBe(false);
    });

    it('should set collapsed state directly', async () => {
        const { useSidebarStore } = await import('./useSidebarStore');
        const { setCollapsed } = useSidebarStore.getState();

        setCollapsed(true);
        expect(useSidebarStore.getState().collapsed).toBe(true);

        setCollapsed(false);
        expect(useSidebarStore.getState().collapsed).toBe(false);
    });

    it('should persist collapsed state to localStorage via persist middleware', async () => {
        const { useSidebarStore } = await import('./useSidebarStore');
        useSidebarStore.getState().setCollapsed(true);

        await new Promise((resolve) => setTimeout(resolve, 10));

        const saved = JSON.parse(localStorage.getItem('cortex-sidebar') || '{}');
        expect(saved.state.collapsed).toBe(true);
    });

    it('should restore collapsed state from localStorage on rehydration', async () => {
        localStorage.setItem(
            'cortex-sidebar',
            JSON.stringify({ state: { collapsed: true }, version: 0 })
        );

        const { useSidebarStore } = await import('./useSidebarStore');
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(useSidebarStore.getState().collapsed).toBe(true);
    });
});

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/services/api/client';

import { useDeleteRecord } from './useDeleteRecord';

vi.mock('@/services/api/client', () => ({
    apiClient: {
        delete: vi.fn(),
    },
}));

describe('useDeleteRecord', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('starts in an idle closed state', () => {
        const onDeleted = vi.fn();
        const { result } = renderHook(() => useDeleteRecord('/breweries', onDeleted));

        expect(result.current.isOpen).toBe(false);
        expect(result.current.isDeleting).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.itemId).toBeNull();
        expect(result.current.success).toBe(false);
    });

    it('opens the modal with the target id and resets prior result states', () => {
        const onDeleted = vi.fn();
        const { result } = renderHook(() => useDeleteRecord('/breweries', onDeleted));

        act(() => {
            result.current.openModal('brewery-1');
        });

        expect(result.current.isOpen).toBe(true);
        expect(result.current.itemId).toBe('brewery-1');
        expect(result.current.error).toBeNull();
        expect(result.current.success).toBe(false);
    });

    it('transitions through deleting to success and auto-closes after 2 seconds', async () => {
        vi.mocked(apiClient.delete).mockResolvedValueOnce(undefined);
        const onDeleted = vi.fn();
        const { result } = renderHook(() => useDeleteRecord('/breweries', onDeleted));

        act(() => {
            result.current.openModal('brewery-1');
        });

        let confirmPromise: Promise<void> = Promise.resolve();
        act(() => {
            confirmPromise = result.current.confirmDelete();
        });

        expect(result.current.isDeleting).toBe(true);
        expect(result.current.error).toBeNull();

        await act(async () => {
            await confirmPromise;
        });

        expect(apiClient.delete).toHaveBeenCalledWith('/breweries/brewery-1');
        expect(result.current.isDeleting).toBe(false);
        expect(result.current.success).toBe(true);
        expect(result.current.isOpen).toBe(true);
        expect(onDeleted).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        await waitFor(() => {
            expect(result.current.isOpen).toBe(false);
        });

        expect(onDeleted).toHaveBeenCalledWith('brewery-1');
        expect(result.current.success).toBe(false);
        expect(result.current.itemId).toBeNull();
    });

    it('keeps the modal open and shows the error when deletion fails', async () => {
        vi.mocked(apiClient.delete).mockRejectedValueOnce(new Error('No tiene permiso para eliminar'));
        const onDeleted = vi.fn();
        const { result } = renderHook(() => useDeleteRecord('/breweries', onDeleted));

        act(() => {
            result.current.openModal('brewery-1');
        });

        let confirmPromise: Promise<void> = Promise.resolve();
        act(() => {
            confirmPromise = result.current.confirmDelete();
        });

        expect(result.current.isDeleting).toBe(true);

        await act(async () => {
            await confirmPromise;
        });

        expect(result.current.isDeleting).toBe(false);
        expect(result.current.success).toBe(false);
        expect(result.current.error).toBe('No tiene permiso para eliminar');
        expect(result.current.isOpen).toBe(true);
        expect(onDeleted).not.toHaveBeenCalled();
    });

    it('closes and resets state when cancelDelete is called', () => {
        const onDeleted = vi.fn();
        const { result } = renderHook(() => useDeleteRecord('/breweries', onDeleted));

        act(() => {
            result.current.openModal('brewery-1');
        });

        act(() => {
            result.current.cancelDelete();
        });

        expect(result.current.isOpen).toBe(false);
        expect(result.current.itemId).toBeNull();
        expect(result.current.error).toBeNull();
        expect(result.current.success).toBe(false);
    });

    it('does not call the API when cancelDelete is called before confirmDelete', () => {
        const onDeleted = vi.fn();
        const { result } = renderHook(() => useDeleteRecord('/breweries', onDeleted));

        act(() => {
            result.current.openModal('brewery-1');
        });

        act(() => {
            result.current.cancelDelete();
        });

        expect(result.current.isOpen).toBe(false);
        expect(apiClient.delete).not.toHaveBeenCalled();
        expect(onDeleted).not.toHaveBeenCalled();
    });

    it('ignores cancelDelete while a deletion is in progress', async () => {
        let resolveDelete: () => void = () => {};
        const deletePromise = new Promise<void>((resolve) => {
            resolveDelete = resolve;
        });
        vi.mocked(apiClient.delete).mockReturnValueOnce(deletePromise);

        const onDeleted = vi.fn();
        const { result } = renderHook(() => useDeleteRecord('/breweries', onDeleted));

        act(() => {
            result.current.openModal('brewery-1');
        });

        let confirmPromise: Promise<void> = Promise.resolve();
        act(() => {
            confirmPromise = result.current.confirmDelete();
        });

        expect(result.current.isDeleting).toBe(true);

        act(() => {
            result.current.cancelDelete();
        });

        expect(result.current.isOpen).toBe(true);
        expect(result.current.isDeleting).toBe(true);
        expect(onDeleted).not.toHaveBeenCalled();

        await act(async () => {
            resolveDelete();
            await confirmPromise;
        });

        expect(result.current.isDeleting).toBe(false);
        expect(result.current.success).toBe(true);
    });
});

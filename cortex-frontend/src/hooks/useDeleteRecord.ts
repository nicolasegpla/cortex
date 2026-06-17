import { useCallback, useEffect, useRef, useState } from 'react';

import { apiClient } from '@/services/api/client';

interface UseDeleteRecordResult {
    isOpen: boolean;
    isDeleting: boolean;
    error: string | null;
    itemId: string | null;
    success: boolean;
    openModal: (id: string) => void;
    confirmDelete: () => Promise<void>;
    cancelDelete: () => void;
}

export function useDeleteRecord(endpoint: string, onDeleted: (id: string) => void): UseDeleteRecordResult {
    const [isOpen, setIsOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [itemId, setItemId] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (autoCloseTimer.current) {
                clearTimeout(autoCloseTimer.current);
            }
        };
    }, []);

    const openModal = useCallback((id: string) => {
        setItemId(id);
        setError(null);
        setSuccess(false);
        setIsOpen(true);
    }, []);

    const cancelDelete = useCallback(() => {
        if (isDeleting) {
            return;
        }

        if (autoCloseTimer.current) {
            clearTimeout(autoCloseTimer.current);
            autoCloseTimer.current = null;
        }
        setIsOpen(false);
        setItemId(null);
        setError(null);
        setSuccess(false);
    }, [isDeleting]);

    const confirmDelete = useCallback(async () => {
        if (!itemId) {
            return;
        }

        setIsDeleting(true);
        setError(null);

        try {
            await apiClient.delete(`${endpoint}/${itemId}`);
            setSuccess(true);
            setIsDeleting(false);

            autoCloseTimer.current = setTimeout(() => {
                onDeleted(itemId);
                setIsOpen(false);
                setItemId(null);
                setSuccess(false);
            }, 2000);
        } catch (err) {
            setIsDeleting(false);
            setSuccess(false);
            setError(err instanceof Error ? err.message : 'Error al eliminar el registro');
        }
    }, [endpoint, itemId, onDeleted]);

    return {
        isOpen,
        isDeleting,
        error,
        itemId,
        success,
        openModal,
        confirmDelete,
        cancelDelete,
    };
}

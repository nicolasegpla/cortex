import { apiClient } from '@/services/api/client';
import type {
    FeedbackFormResult,
    FeedbackPayload,
} from '@/presentation/components/organisms/FeedbackModal/FeedbackModal';

const NETWORK_ERROR_MESSAGE = 'No se pudo conectar con el servidor. Verificá tu conexión.';
const UNEXPECTED_ERROR_MESSAGE = 'Ocurrió un error inesperado. Intentá de nuevo.';

// The backend feedback schema uses extra="forbid": the payload must be exactly
// {type, subject, message}. Identity is derived from the JWT server-side, so no
// email/role/currentUrl fields are ever added here.
async function submitFeedback(payload: FeedbackPayload): Promise<FeedbackFormResult> {
    try {
        return await apiClient.post<FeedbackFormResult>('/support/feedback', payload);
    } catch (error) {
        if (error instanceof TypeError) {
            return { success: false, message: NETWORK_ERROR_MESSAGE };
        }
        return {
            success: false,
            message: error instanceof Error ? error.message : UNEXPECTED_ERROR_MESSAGE,
        };
    }
}

export { submitFeedback };
export type { FeedbackFormResult, FeedbackPayload };

export const supportApi = {
    submitFeedback,
};

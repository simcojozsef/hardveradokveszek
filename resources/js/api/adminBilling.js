import { apiFetch } from './client';

/*
 * Admin billing pipeline: invoices, failures and uncertain tasks.
 */
export async function getAdminBilling(status) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';

    return apiFetch(`/admin/billing${query}`);
}

// Re-runs the same idempotent path; never creates a second document.
export async function retryInvoiceTask(taskId) {
    return apiFetch(`/admin/billing/${taskId}/retry`, { method: 'POST' });
}

export async function flagInvoiceReview(taskId, reviewStatus, note = '') {
    return apiFetch(`/admin/billing/${taskId}/review`, {
        method: 'POST',
        body: JSON.stringify({ review_status: reviewStatus, review_note: note }),
    });
}

export async function recordInvoiceCorrection(taskId, payload) {
    return apiFetch(`/admin/billing/${taskId}/correction`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

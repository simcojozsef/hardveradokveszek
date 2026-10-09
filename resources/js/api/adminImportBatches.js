import { apiFetch } from './client';

/*
 * Bulk upload batches. An admin switches a whole import on or off; the
 * products belonging to it follow.
 */
export async function getImportBatches() {
    return apiFetch('/admin/import-batches');
}

export async function setImportBatchStatus(batchId, status) {
    return apiFetch(`/admin/import-batches/${batchId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
}

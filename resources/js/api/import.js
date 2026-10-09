import { apiFetch } from './client';

/*
 * PRO XLSX/CSV import.
 *
 * The template is a plain download (an <a href>), because it is a file
 * response rather than JSON. The preview and commit are JSON API calls.
 */
export function importTemplateUrl(format = 'xlsx', mode = 'create') {
    return `/api/my/products/import/template?format=${format}&mode=${mode}`;
}

export async function previewImport(file, mode = 'create') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);

    return apiFetch('/my/products/import/preview', {
        method: 'POST',
        body: formData,
    });
}

export async function commitImport(importId, fingerprint) {
    return apiFetch(`/my/products/import/${importId}/commit`, {
        method: 'POST',
        body: JSON.stringify({ fingerprint }),
    });
}

/* Media library ---------------------------------------------------------- */

export async function getMyMedia() {
    return apiFetch('/my/media');
}

export async function uploadMedia(files) {
    const formData = new FormData();
    // Laravel reads an array when the field name uses brackets.
    files.forEach((file) => formData.append('files[]', file));

    return apiFetch('/my/media', { method: 'POST', body: formData });
}

export async function deleteMedia(mediaId) {
    return apiFetch(`/my/media/${mediaId}`, { method: 'DELETE' });
}

/* Reference lists -------------------------------------------------------- */

export async function getReferenceCategories() {
    return apiFetch('/reference/categories');
}

export async function getReferenceCounties() {
    return apiFetch('/reference/counties');
}

export async function getReferenceSettlements() {
    return apiFetch('/reference/settlements');
}

import { apiFetch } from './client';

/*
 * PRO XLSX/CSV import.
 *
 * The template is a plain download (an <a href>), because it is a file
 * response rather than JSON. The preview and commit are JSON API calls.
 */
export function importTemplateUrl(format = 'xlsx') {
    return `/api/my/products/import/template?format=${format}`;
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

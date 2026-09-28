import { apiFetch } from './client';

export async function getStore(slug) {
    return apiFetch(`/stores/${slug}`);
}
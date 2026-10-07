import { apiFetch } from './client';

export async function getStore(slug) {
    return apiFetch(`/stores/${slug}`);
}

export async function getStores() {
    return apiFetch('/stores');
}
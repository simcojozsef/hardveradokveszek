import { apiFetch } from './client';

export async function getProduct(id) {
    return apiFetch(`/products/${id}`);
}
import { apiFetch } from './client';
export async function getMyStore() { return apiFetch('/my/store'); }
export async function getMyProducts(page = 1) { return apiFetch(`/my/products?page=${page}`); }
export async function createProduct(storeSlug, data) {
    return apiFetch(`/stores/${storeSlug}/products`, { method: 'POST', body: JSON.stringify(data) });
}
export async function uploadProductImage(productId, file, { sortOrder = 0, isPrimary = false } = {}) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('sort_order', String(sortOrder));
    formData.append('is_primary', isPrimary ? '1' : '0');
    return apiFetch(`/products/${productId}/images`, { method: 'POST', body: formData });
}
export async function deleteProduct(productId) {
    return apiFetch(`/products/${productId}`, { method: 'DELETE' });
}
// Seller-only reads allow editing inactive products without exposing them publicly.
export async function getProduct(productId) { return apiFetch(`/my/products/${productId}`); }
export async function updateProduct(productId, data) {
    return apiFetch(`/products/${productId}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export async function getProductImages(productId) { return apiFetch(`/my/products/${productId}/images`); }
export async function updateProductImage(imageId, { sortOrder, isPrimary, file = null } = {}) {
    const formData = new FormData();
    if (file) formData.append('image', file);
    if (sortOrder !== undefined) formData.append('sort_order', String(sortOrder));
    if (isPrimary !== undefined) formData.append('is_primary', isPrimary ? '1' : '0');
    formData.append('_method', 'PATCH');
    return apiFetch(`/product-images/${imageId}`, { method: 'POST', body: formData });
}
export async function deleteProductImage(imageId) {
    return apiFetch(`/product-images/${imageId}`, { method: 'DELETE' });
}
export async function updateMyStore(data) {
    return apiFetch('/my/store', { method: 'PATCH', body: JSON.stringify(data) });
}
export async function uploadStoreLogo(file) {
    const formData = new FormData();
    formData.append('logo', file);
    return apiFetch('/my/store/logo', { method: 'POST', body: formData });
}
export async function deleteStoreLogo() { return apiFetch('/my/store/logo', { method: 'DELETE' }); }
export async function createStore(data) {
    return apiFetch('/stores', { method: 'POST', body: JSON.stringify(data) });
}
export async function getMyOrders() { return apiFetch('/my/seller-orders'); }
export async function getMyOrder(orderGroupId) { return apiFetch(`/my/seller-orders/${orderGroupId}`); }
export async function updateMyOrderStatus(orderGroupId, status) {
    return apiFetch(`/my/seller-orders/${orderGroupId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}
export async function getRefund(refundId) { return apiFetch(`/my/refunds/${refundId}`); }
export async function completeRefund(refundId, formData) {
    return apiFetch(`/my/refunds/${refundId}/complete`, { method: 'POST', body: formData });
}
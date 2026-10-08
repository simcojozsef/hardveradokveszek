import { apiFetch } from './client';
export async function getMyStore() { return apiFetch('/my/store'); }
// Read-only: the plan, its limits and current usage. There is no setter.
export async function getMyPlan() { return apiFetch('/my/plan'); }

// PRO subscription: state, billing data, checkout and portal.
export async function getMySubscription() { return apiFetch('/my/subscription'); }
export async function saveBillingProfile(data) {
    return apiFetch('/my/subscription/billing', { method: 'POST', body: JSON.stringify(data) });
}
// Starts the server-side PRO checkout; the amount is never sent by the client.
export async function startProCheckout() {
    return apiFetch('/my/subscription/checkout', { method: 'POST' });
}
export async function openBillingPortal() {
    return apiFetch('/my/subscription/portal', { method: 'POST' });
}

// Listings to keep when PRO ends. The server caps at 10 and verifies
// ownership, so the client only ever sends its own product ids.
export async function getMyRetention() { return apiFetch('/my/retention'); }
export async function saveMyRetention(productIds) {
    return apiFetch('/my/retention', {
        method: 'POST',
        body: JSON.stringify({ product_ids: productIds }),
    });
}

// The seller's own PRO invoices; scoped to the caller by the server.
export async function getMyInvoices() { return apiFetch('/my/invoices'); }

// Seller statistics. Every plan gets per-listing totals; the series is PRO,
// and the server says which parts are available.
export async function getMyStatistics(days) {
    const query = days ? `?days=${encodeURIComponent(days)}` : '';

    return apiFetch(`/my/statistics${query}`);
}

// Pre-reservation: allowance status and the bump itself. The server owns the
// allowance; the client only asks and reports the answer.
export async function getBumpStatus(productId) {
    return apiFetch(`/my/products/${productId}/bump`);
}
export async function bumpProduct(productId) {
    return apiFetch(`/my/products/${productId}/bump`, { method: 'POST' });
}

// PRO bulk operations. Max 100 own listings; the server enforces PRO,
// ownership and the one-transaction guarantee.
export async function bulkRenewProducts(productIds) {
    return apiFetch('/my/products/bulk/renew', {
        method: 'POST',
        body: JSON.stringify({
            product_ids: productIds,
            available_confirmed: true,
        }),
    });
}
export async function bulkUpdatePriceStock(rows) {
    return apiFetch('/my/products/bulk/price-stock', {
        method: 'POST',
        body: JSON.stringify({ rows }),
    });
}
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
// Renew or reactivate one of the seller's own listings. The availability
// confirmation is required by the product rules.
export async function renewProduct(productId, availableConfirmed = true) {
    return apiFetch(`/my/products/${productId}/renew`, {
        method: 'POST',
        body: JSON.stringify({ available_confirmed: availableConfirmed }),
    });
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
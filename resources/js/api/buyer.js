import { apiFetch } from './client';

export async function getMyOrders() {
    return apiFetch('/my/orders');
}

export async function confirmOrderReceipt(
    orderSellerGroupId,
    action
) {
    return apiFetch(
        `/my/orders/${orderSellerGroupId}/receipt`,
        {
            method: 'POST',
            body: JSON.stringify({
                action,
            }),
        }
    );
}

export async function getMyCart() {
    return apiFetch('/my/cart');
}

export async function addToCart(productId, quantity = 1) {
    return apiFetch(`/my/cart/products/${productId}`, {
        method: 'POST',
        body: JSON.stringify({
            quantity,
        }),
    });
}

export async function updateCartItem(
    cartItemId,
    quantity
) {
    return apiFetch(`/my/cart/${cartItemId}`, {
        method: 'PATCH',
        body: JSON.stringify({
            quantity,
        }),
    });
}

export async function removeCartItem(cartItemId) {
    return apiFetch(`/my/cart/${cartItemId}`, {
        method: 'DELETE',
    });
}

export async function checkout(data) {
    return apiFetch('/my/checkout', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function requestRefund(
    orderSellerGroupId,
    data
) {
    return apiFetch(
        `/my/seller-orders/${orderSellerGroupId}/refund`,
        {
            method: 'POST',
            body: JSON.stringify(data),
        }
    );
}

export async function getRefundProof(refundId) {
    const response = await fetch(
        `/api/my/refunds/${refundId}/proof`,
        {
            method: 'GET',
            credentials: 'include',
            headers: {
                Accept: 'application/pdf',
            },
        }
    );

    if (!response.ok) {
        let message = 'A bizonylat nem tölthető be.';

        try {
            const data = await response.json();

            if (data.message) {
                message = data.message;
            }
        } catch {
            // PDF/error response may not be JSON
        }

        throw new Error(message);
    }

    return response.blob();
}
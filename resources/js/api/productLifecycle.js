import { apiFetch } from './client';

export function updateProductListingStatus(productId, listingStatus) {
    return apiFetch(`/my/products/${productId}/listing-status`, {
        method: 'PATCH',
        body: JSON.stringify({ listing_status: listingStatus }),
    });
}
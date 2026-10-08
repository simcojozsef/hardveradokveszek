import { apiFetch } from './client';

/*
 * Whether this host is a store subdomain, and which store it belongs to.
 *
 * Resolved server-side from the request host, so the client never has to
 * parse the domain itself.
 */
export async function getStorefrontContext() {
    return apiFetch('/storefront');
}

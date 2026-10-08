import { useEffect, useState } from 'react';

import { getStorefrontContext } from '../api/storefront';

/*
 * Whether this host is a store subdomain, and which store it belongs to.
 *
 * Resolved once on mount. The server decides from the Host header, so nothing
 * here parses the domain; the hook only exposes the answer to the router.
 */
export default function useStorefrontContext() {
    const [context, setContext] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        getStorefrontContext()
            .then((response) => {
                if (!cancelled) setContext(response.data);
            })
            .catch(() => {
                // On any failure, behave like the apex domain.
                if (!cancelled) {
                    setContext({ is_store_subdomain: false, store: null });
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return { context, loading };
}

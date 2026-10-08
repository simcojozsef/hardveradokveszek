import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';

import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useStorefrontContext from '../hooks/useStorefrontContext';

export default function PublicLayout() {
    const location = useLocation();
    const { context, loading } = useStorefrontContext();

    /*
     * On a store subdomain the root path IS the storefront. Rather than
     * duplicating the store page, the root is redirected to the existing
     * store route, so there is one implementation and one set of rules.
     */
    const isStoreHome =
        context?.is_store_subdomain &&
        context.store?.slug &&
        location.pathname === '/';

    if (isStoreHome) {
        return <Navigate to={`/store/${context.store.slug}`} replace />;
    }

    return (
        <div className="app-layout">
            {/*
             * Ambient backdrop: a very light tinted wash plus a soft brand
             * glow at the top. Purely decorative, sits behind all content.
             */}
            <div className="app-layout__backdrop" aria-hidden="true" />

            <Navbar />

            <main className="app-layout__content">
                {/*
                 * The context resolves after the first paint, so hold the
                 * outlet briefly to avoid flashing the marketplace home on a
                 * store subdomain.
                 */}
                {loading && !context ? null : <Outlet />}
            </main>

            <Footer />
        </div>
    );
}
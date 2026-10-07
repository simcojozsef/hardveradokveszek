import React from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import SellerMessagesNavLink from '../../components/SellerMessagesNavLink';

export default function SellerLayout() {
    return (
        <div className="seller-layout">
            <aside className="seller-sidebar">
                <Link to="/seller" className="seller-sidebar__brand">
                    GigaPiac
                </Link>

                <nav className="seller-sidebar__nav">
                    <NavLink to="/seller">
                        Vezérlőpult
                    </NavLink>

                    <NavLink to="/seller/store">
                        Üzlet
                    </NavLink>

                    <NavLink to="/seller/products">
                        Termékek
                    </NavLink>
                    <SellerMessagesNavLink />
                    <NavLink to="/seller/products/create">
                        + Új termék
                    </NavLink>
                </nav>

                <div className="seller-sidebar__footer">
                    <Link to="/">
                        ← Marketplace
                    </Link>
                </div>
            </aside>

            <main className="seller-content">
                <Outlet />
            </main>
        </div>
    );
}

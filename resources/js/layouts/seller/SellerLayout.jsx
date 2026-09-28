import React from 'react';
import { Link, NavLink, Outlet } from 'react-router';

export default function SellerLayout() {
    return (
        <div className="seller-layout">
            <aside className="seller-sidebar">
                <Link to="/seller" className="seller-sidebar__brand">
                    HardverAdokVeszek
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
                    <NavLink to="/seller/orders">
                        Rendelések
                    </NavLink>
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
import React from 'react';
import { NavLink, Outlet } from 'react-router';

export default function AdminLayout() {
    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-sidebar__brand">
                    <p className="eyebrow">
                        Adminisztráció
                    </p>

                    <h2>GigaPiac</h2>
                </div>

                <nav className="admin-nav">
                    <NavLink
                        to="/admin"
                        end
                        className={({ isActive }) =>
                            `admin-nav__link ${
                                isActive
                                    ? 'admin-nav__link--active'
                                    : ''
                            }`
                        }
                    >
                        Vezérlőpult
                    </NavLink>

                    <NavLink
                        to="/admin/users"
                        className={({ isActive }) =>
                            `admin-nav__link ${
                                isActive
                                    ? 'admin-nav__link--active'
                                    : ''
                            }`
                        }
                    >
                        Felhasználók
                    </NavLink>

                    <NavLink
                        to="/admin/stores"
                        className={({ isActive }) =>
                            `admin-nav__link ${
                                isActive
                                    ? 'admin-nav__link--active'
                                    : ''
                            }`
                        }
                    >
                        Üzletek
                    </NavLink>

                    <NavLink
                        to="/admin/products"
                        className={({ isActive }) =>
                            `admin-nav__link ${
                                isActive
                                    ? 'admin-nav__link--active'
                                    : ''
                            }`
                        }
                    >
                        Termékek
                    </NavLink>
                    <NavLink
                        to="/admin/categories"
                        className={({ isActive }) =>
                            `admin-nav__link ${
                                isActive
                                    ? 'admin-nav__link--active'
                                    : ''
                            }`
                        }
                    >
                        Kategóriák
                    </NavLink>
                    <NavLink
                        to="/admin/orders"
                        className={({ isActive }) =>
                            `admin-nav__link ${
                                isActive
                                    ? 'admin-nav__link--active'
                                    : ''
                            }`
                        }
                    >
                        Rendelések
                    </NavLink>

                    <NavLink
                        to="/admin/refunds"
                        className={({ isActive }) =>
                            `admin-nav__link ${
                                isActive
                                    ? 'admin-nav__link--active'
                                    : ''
                            }`
                        }
                    >
                        Visszatérítések
                    </NavLink>
                    <NavLink
                        to="/admin/logs"
                        className={({ isActive }) =>
                            `admin-nav__link ${
                                isActive
                                    ? 'admin-nav__link--active'
                                    : ''
                            }`
                        }
                    >
                        Napló
                    </NavLink>
                    <NavLink
                        to="/admin/analytics"
                        className={({ isActive }) =>
                            `admin-nav__link ${
                                isActive
                                    ? 'admin-nav__link--active'
                                    : ''
                            }`
                        }
                    >
                        Analitika
                    </NavLink>
                    <NavLink
                        to="/admin/billing"
                        className={({ isActive }) =>
                            `admin-nav__link ${
                                isActive
                                    ? 'admin-nav__link--active'
                                    : ''
                            }`
                        }
                    >
                        Számlázás
                    </NavLink>
                    <NavLink
                        to="/admin/import-batches"
                        className={({ isActive }) =>
                            `admin-nav__link ${
                                isActive
                                    ? 'admin-nav__link--active'
                                    : ''
                            }`
                        }
                    >
                        Tömeges feltöltések
                    </NavLink>
                </nav>
            </aside>

            <main className="admin-layout__content">
                <Outlet />
            </main>
        </div>
    );
}
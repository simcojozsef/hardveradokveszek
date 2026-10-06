import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { FiLogIn, FiUserPlus, FiLogOut } from 'react-icons/fi';

export default function Navbar() {
    const navigate = useNavigate();

    const {
        user,
        isAuthenticated,
        logout,
    } = useAuth();

    const [menuOpen, setMenuOpen] = useState(false);

    function closeMenu() {
        setMenuOpen(false);
    }

    async function handleLogout() {
        try {
            await logout();
            closeMenu();
            navigate('/');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    function getDashboardPath() {
        if (user?.role === 'seller') {
            return '/seller';
        }

        if (user?.role === 'admin') {
            return '/admin';
        }

        return '/buyer';
    }

    return (
        <header className="navbar">
            <div className="navbar__inner">
                <Link
                    to="/"
                    className="navbar__brand"
                    onClick={closeMenu}
                >
                    <img
                        src="/images/website-images/logo.png"
                        alt="GigaPiac"
                        className="navbar__logo"
                    />
                </Link>

                {/* Desktop navigation */}
                <nav className="navbar__nav">
                    <Link to="/">
                        Kezdőlap
                    </Link>

                    {isAuthenticated ? (
                        <>
                            <Link to={getDashboardPath()}>
                                Vezérlőpult
                            </Link>

                            <span className="navbar__user">
                                {user?.name}
                            </span>

                            <button
                                type="button"
                                className="navbar__logout"
                                onClick={handleLogout}
                            >
                                <span>Kijelentkezés</span>
                                <FiLogOut aria-hidden="true" />
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="auth-link">
                                <span>Bejelentkezés</span>
                                <FiLogIn aria-hidden="true" />
                            </Link>

                            <Link to="/register" className="auth-link">
                                <span>Regisztráció</span>
                                <FiUserPlus aria-hidden="true" />
                            </Link>
                        </>
                    )}
                </nav>

                {/* Mobile menu button */}
                <button
                    type="button"
                    className={`navbar__toggle ${
                        menuOpen
                            ? 'navbar__toggle--open'
                            : ''
                    }`}
                    onClick={() =>
                        setMenuOpen((previous) => !previous)
                    }
                    aria-label={
                        menuOpen
                            ? 'Menü bezárása'
                            : 'Menü megnyitása'
                    }
                    aria-expanded={menuOpen}
                    aria-controls="mobile-navigation"
                >
                    <span />
                    <span />
                    <span />
                </button>
            </div>

            {/* Mobile navigation */}
            <div
                id="mobile-navigation"
                className={`navbar__mobile ${
                    menuOpen
                        ? 'navbar__mobile--open'
                        : ''
                }`}
            >
                <nav className="navbar__mobile-nav">
                    <Link
                        to="/"
                        onClick={closeMenu}
                    >
                        Kezdőlap
                    </Link>

                    {isAuthenticated ? (
                        <>
                            <Link
                                to={getDashboardPath()}
                                onClick={closeMenu}
                            >
                                Vezérlőpult
                            </Link>

                            
                            {user?.role === 'buyer' && (
                                <Link
                                    to="/buyer/cart"
                                    onClick={closeMenu}
                                >
                                    Kosár
                                </Link>
                            )}

                            <div className="navbar__mobile-user">
                                <span className="navbar__mobile-user-label">
                                    Bejelentkezve
                                </span>

                                <strong>
                                    {user?.name}
                                </strong>
                            </div>

                            <button
                                type="button"
                                className="navbar__mobile-logout"
                                onClick={handleLogout}
                            >
                                Kijelentkezés
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                onClick={closeMenu}
                            >
                                Bejelentkezés
                            </Link>

                            <Link
                                to="/register"
                                onClick={closeMenu}
                            >
                                Regisztráció
                            </Link>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}
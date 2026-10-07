import React, { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { FiLogIn, FiUserPlus } from 'react-icons/fi';
import PostListingButton from './PostListingButton';
import ProfileDropdown from './ProfileDropdown';

export default function Navbar() {
    const { isAuthenticated } = useAuth();

    const [menuOpen, setMenuOpen] = useState(false);

    function closeMenu() {
        setMenuOpen(false);
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

                    <Link to="/stores">
                        Boltok
                    </Link>

                    {isAuthenticated ? (
                        <ProfileDropdown />
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

                            <PostListingButton />
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

                    <Link
                        to="/stores"
                        onClick={closeMenu}
                    >
                        Boltok
                    </Link>

                    {isAuthenticated ? (
                        <>
                            <ProfileDropdown variant="mobile" onNavigate={closeMenu} />

                            <PostListingButton
                                variant="mobile"
                                onNavigate={closeMenu}
                            />
                        </>
                    ) : (
                        <>
                            <PostListingButton
                                variant="mobile"
                                onNavigate={closeMenu}
                            />

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
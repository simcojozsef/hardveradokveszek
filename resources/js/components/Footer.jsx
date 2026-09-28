import React from 'react';
import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
    const {
        user,
        isAuthenticated,
    } = useAuth();

    function handleFooterClick() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    }

    function handleHomeClick(event) {
        if (window.location.pathname === '/') {
            event.preventDefault();

            window.scrollTo({
                top: 0,
                behavior: 'smooth',
            });

            return;
        }

        handleFooterClick();
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
        <footer className="footer">
            <div className="footer__main">
                <div className="footer__inner">

                    {/* Marketplace */}
                    <div className="footer__column">
                        <h3>
                            Marketplace
                        </h3>

                        <Link
                            to="/"
                            onClick={handleHomeClick}
                        >
                            Kezdőlap
                        </Link>

                        <Link
                            to="/register"
                            onClick={handleFooterClick}
                        >
                            Eladás
                        </Link>
                    </div>

                    {/* Fiók */}
                    <div className="footer__column">
                        <h3>
                            Fiók
                        </h3>

                        {isAuthenticated ? (
                            <>
                                <Link
                                    to={getDashboardPath()}
                                    onClick={handleFooterClick}
                                >
                                    Vezérlőpult
                                </Link>

                                {user?.role === 'buyer' && (
                                    <Link
                                        to="/buyer/cart"
                                        onClick={handleFooterClick}
                                    >
                                        Kosár
                                    </Link>
                                )}
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    onClick={handleFooterClick}
                                >
                                    Bejelentkezés
                                </Link>

                                <Link
                                    to="/register"
                                    onClick={handleFooterClick}
                                >
                                    Regisztráció
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Navigáció */}
                    <div className="footer__column">
                        <h3>
                            Navigáció
                        </h3>

                        <Link
                            to="/"
                            onClick={handleHomeClick}
                        >
                            Kezdőlap
                        </Link>

                        <Link
                            to="/marketplace"
                            onClick={handleFooterClick}
                        >
                            Termékek
                        </Link>
                    </div>

                    {/* Jog */}
                    <div className="footer__column">
                        <h3>
                            Jog
                        </h3>

                        <a
                            href="/storage/law/HardverAdokVeszek_ASZF.pdf"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Általános Szerződési Feltételek
                        </a>

                        <a
                            href="/storage/law/HardverAdokVeszek_Adatkezelesi_Tajekoztato.pdf"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Adatkezelési Tájékoztató
                        </a>

                        <a
                            href="/storage/law/HardverAdokVeszek_Cookie_Tajekoztato.pdf"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Cookie Tájékoztató
                        </a>
                    </div>

                </div>
            </div>

            <div className="footer__bottom">
                <div className="footer__bottom-inner">
                    <span>
                        © {new Date().getFullYear()} HardverAdokVeszek
                    </span>

                    <span>
                        Minden jog fenntartva.
                    </span>
                </div>
            </div>
        </footer>
    );
}
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
    FiChevronDown,
    FiGrid,
    FiLogOut,
    FiMessageSquare,
    FiPackage,
    FiSettings,
    FiUser,
} from 'react-icons/fi';

import { useAuth } from '../context/AuthContext';

import '../../css/profile-dropdown.css';

/*
 * Private-area navigation for signed-in users.
 *
 * The seller menu mirrors the seller sidebar (dashboard, store, products,
 * messages) and the buyer menu mirrors the buyer pages (dashboard, cart,
 * messages). Both end with the signed-in identity and a logout action.
 */
function getMenuItems(user) {
    if (user?.role === 'seller') {
        return [
            { to: '/seller', label: 'Vezérlőpult', icon: <FiGrid />, end: true },
            { to: '/seller/store', label: 'Üzlet beállítások', icon: <FiSettings /> },
            { to: '/seller/products', label: 'Termékek', icon: <FiPackage /> },
            { to: '/seller/chats', label: 'Üzenetek', icon: <FiMessageSquare /> },
        ];
    }

    if (user?.role === 'admin') {
        return [
            { to: '/admin', label: 'Vezérlőpult', icon: <FiGrid />, end: true },
        ];
    }

    return [
        { to: '/buyer', label: 'Vezérlőpult', icon: <FiGrid />, end: true },
        { to: '/buyer/messages', label: 'Üzenetek', icon: <FiMessageSquare /> },
    ];
}

export default function ProfileDropdown({ variant = 'desktop', onNavigate }) {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    function close() {
        setOpen(false);
        onNavigate?.();
    }

    useEffect(() => {
        if (!open) return undefined;

        function handlePointerDown(event) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target)
            ) {
                setOpen(false);
            }
        }

        function handleKeyDown(event) {
            if (event.key === 'Escape') setOpen(false);
        }

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    async function handleLogout() {
        try {
            await logout();
            close();
            navigate('/');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    if (!user) return null;

    const items = getMenuItems(user);

    return (
        <div
            className={`profile-dropdown profile-dropdown--${variant} ${
                open ? 'profile-dropdown--open' : ''
            }`}
            ref={containerRef}
        >
            <button
                type="button"
                className={`profile-dropdown__trigger ${
                    open ? 'profile-dropdown__trigger--open' : ''
                }`}
                onClick={() => setOpen((previous) => !previous)}
                aria-haspopup="true"
                aria-expanded={open}
                aria-label="Fiók menü"
            >
                <span className="profile-dropdown__avatar" aria-hidden="true">
                    {user.name?.charAt(0)?.toUpperCase() ?? <FiUser />}
                </span>

                <span className="profile-dropdown__name">{user.name}</span>

                <FiChevronDown
                    className="profile-dropdown__chevron"
                    aria-hidden="true"
                />
            </button>

            {open && (
                <div className="profile-dropdown__menu" role="menu">
                    <div className="profile-dropdown__identity">
                        <span className="profile-dropdown__identity-label">
                            Bejelentkezve mint
                        </span>
                        <strong>{user.name}</strong>
                    </div>

                    <div className="profile-dropdown__items">
                        {items.map((item) => (
                            <Link
                                key={item.to}
                                to={item.to}
                                className="profile-dropdown__item"
                                role="menuitem"
                                onClick={close}
                            >
                                <span
                                    className="profile-dropdown__item-icon"
                                    aria-hidden="true"
                                >
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="profile-dropdown__logout"
                        role="menuitem"
                        onClick={handleLogout}
                    >
                        <span
                            className="profile-dropdown__item-icon"
                            aria-hidden="true"
                        >
                            <FiLogOut />
                        </span>
                        <span>Kijelentkezés</span>
                    </button>
                </div>
            )}
        </div>
    );
}

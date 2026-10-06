import React from 'react';
import { Link } from 'react-router';
import { FiPlusCircle } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

/**
 * Primary call to action: "Hirdetésfeladás".
 *
 * Guests are sent to registration (the requested /register entry point), while
 * signed-in users go straight to the store surface: the product form when the
 * store already exists, otherwise store creation.
 */
export default function PostListingButton({
    className = '',
    variant = 'primary',
    onNavigate,
}) {
    const { user, isAuthenticated } = useAuth();

    const hasStore = Boolean(user?.store);
    const isBuyer = user?.role === 'buyer';
    const isAdmin = user?.role === 'admin';

    let label = 'Hirdetésfeladás';
    let to = '/register';

    if (isAuthenticated) {
        if (isAdmin) {
            label = 'Admin';
            to = '/admin';
        } else if (isBuyer) {
            label = 'Eladóvá válok';
            to = '/seller/store/create';
        } else if (hasStore) {
            label = 'Új hirdetés';
            to = '/seller/products/create';
        } else {
            label = 'Üzlet létrehozása';
            to = '/seller/store/create';
        }
    }

    const classes = [
        'post-listing-button',
        `post-listing-button--${variant}`,
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <Link to={to} className={classes} onClick={onNavigate}>
            <FiPlusCircle aria-hidden="true" />
            <span>{label}</span>
        </Link>
    );
}

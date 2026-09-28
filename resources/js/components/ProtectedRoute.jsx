import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({
    children,
    roles = [],
}) {
    const {
        user,
        loading,
    } = useAuth();

    if (loading) {
        return (
            <main className="page">
                Betöltés...
            </main>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (
        roles.length > 0 &&
        !roles.includes(user.role)
    ) {
        return <Navigate to="/" replace />;
    }

    return children;
}
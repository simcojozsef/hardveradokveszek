import React, { useEffect, useMemo, useState } from 'react';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';

async function getAdminUsers() {
    const response = await fetch('/api/admin/users', {
        headers: {
            Accept: 'application/json',
        },
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(
            'Nem sikerült betölteni a felhasználókat.'
        );
    }

    return response.json();
}

async function deleteAdminUser(id) {
    const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: {
            Accept: 'application/json',
        },
        credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ?? 'Nem sikerült törölni a felhasználót.'
        );
    }

    return data;
}

const roleLabels = {
    admin: 'Admin',
    seller: 'Eladó',
    buyer: 'Vásárló',
};

export default function Users() {
    const confirm = useConfirm();
    const toast = useToast();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [deletingId, setDeletingId] = useState(null);

    async function loadUsers() {
        try {
            setLoading(true);
            setError('');

            const response = await getAdminUsers();

            setUsers(response.data ?? []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadUsers();
    }, []);

    async function handleDelete(user) {
        const confirmed = await confirm({
            message: `Biztosan törlöd a(z) "${user.name}" felhasználót?`,
            confirmLabel: 'Igen',
            cancelLabel: 'Nem',
            tone: 'danger',
        });

        if (!confirmed) {
            return;
        }

        try {
            setDeletingId(user.id);
            setError('');

            await deleteAdminUser(user.id);

            setUsers((current) =>
                current.filter((item) => item.id !== user.id)
            );

            toast.success?.('Felhasználó törölve.');
        } catch (err) {
            setError(err.message);
            toast.error?.(err.message);
        } finally {
            setDeletingId(null);
        }
    }

    const filteredUsers = useMemo(() => {
        const query = search.trim().toLowerCase();

        return users.filter((user) => {
            const matchesSearch =
                !query ||
                user.name
                    ?.toLowerCase()
                    .includes(query) ||
                user.email
                    ?.toLowerCase()
                    .includes(query);

            const matchesRole =
                roleFilter === 'all' ||
                user.role === roleFilter;

            return matchesSearch && matchesRole;
        });
    }, [users, search, roleFilter]);

    const roleCounts = useMemo(() => {
        return {
            all: users.length,
            admin: users.filter(
                (user) => user.role === 'admin'
            ).length,
            seller: users.filter(
                (user) => user.role === 'seller'
            ).length,
            buyer: users.filter(
                (user) => user.role === 'buyer'
            ).length,
        };
    }, [users]);

    return (
        <div className="admin-page">
            <header className="admin-page__header">
                <div>
                    <p className="eyebrow">
                        Adminisztráció
                    </p>

                    <h1>Felhasználók</h1>

                    <p className="admin-page__description">
                        A regisztrált felhasználók és
                        szerepköreik kezelése.
                    </p>
                </div>

                <div className="admin-page__header-meta">
                    <strong>
                        {users.length}
                    </strong>

                    <span>
                        felhasználó
                    </span>
                </div>
            </header>

            {error && (
                <div className="form-error">
                    {error}
                </div>
            )}

            <section className="admin-filter-bar">
                <div className="admin-search">
                    <input
                        type="search"
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value
                            )
                        }
                        placeholder="Keresés név vagy e-mail alapján..."
                    />
                </div>

                <div className="admin-role-filters">
                    <button
                        type="button"
                        className={
                            roleFilter === 'all'
                                ? 'admin-filter-button admin-filter-button--active'
                                : 'admin-filter-button'
                        }
                        onClick={() =>
                            setRoleFilter('all')
                        }
                    >
                        Összes
                        <span>
                            {roleCounts.all}
                        </span>
                    </button>

                    <button
                        type="button"
                        className={
                            roleFilter === 'admin'
                                ? 'admin-filter-button admin-filter-button--active'
                                : 'admin-filter-button'
                        }
                        onClick={() =>
                            setRoleFilter('admin')
                        }
                    >
                        Admin
                        <span>
                            {roleCounts.admin}
                        </span>
                    </button>

                    <button
                        type="button"
                        className={
                            roleFilter === 'seller'
                                ? 'admin-filter-button admin-filter-button--active'
                                : 'admin-filter-button'
                        }
                        onClick={() =>
                            setRoleFilter('seller')
                        }
                    >
                        Eladók
                        <span>
                            {roleCounts.seller}
                        </span>
                    </button>

                    <button
                        type="button"
                        className={
                            roleFilter === 'buyer'
                                ? 'admin-filter-button admin-filter-button--active'
                                : 'admin-filter-button'
                        }
                        onClick={() =>
                            setRoleFilter('buyer')
                        }
                    >
                        Vásárlók
                        <span>
                            {roleCounts.buyer}
                        </span>
                    </button>
                </div>
            </section>

            <section className="dashboard-card admin-list-card">
                <div className="admin-list-card__header">
                    <div>
                        <p className="eyebrow">
                            Felhasználói lista
                        </p>

                        <h2>
                            {filteredUsers.length}{' '}
                            találat
                        </h2>
                    </div>
                </div>

                {loading ? (
                    <div className="admin-empty-state">
                        <p>
                            Felhasználók betöltése...
                        </p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="admin-empty-state">
                        <strong>
                            Nincs találat.
                        </strong>

                        <p>
                            Próbálj más keresést vagy
                            másik szerepkört.
                        </p>
                    </div>
                ) : (
                    <div className="admin-table-wrapper">
                        <table className="admin-table admin-users-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Felhasználó</th>
                                    <th>Szerepkör</th>
                                    <th>Regisztráció</th>
                                    <th>Műveletek</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredUsers.map(
                                    (user) => (
                                        <tr key={user.id}>
                                            <td>
                                                <span className="admin-id">
                                                    #{user.id}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="admin-user-cell">
                                                    <div className="admin-user-avatar">
                                                        {user.name
                                                            ?.charAt(
                                                                0
                                                            )
                                                            ?.toUpperCase()}
                                                    </div>

                                                    <div>
                                                        <strong>
                                                            {
                                                                user.name
                                                            }
                                                        </strong>

                                                        <span>
                                                            {
                                                                user.email
                                                            }
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>
                                                <span
                                                    className={`admin-role-badge admin-role-badge--${user.role}`}
                                                >
                                                    {roleLabels[
                                                        user.role
                                                    ] ??
                                                        user.role}
                                                </span>
                                            </td>

                                            <td>
                                                <span className="admin-date">
                                                    {new Date(
                                                        user.created_at
                                                    ).toLocaleDateString(
                                                        'hu-HU'
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="admin-row-actions">
                                                    <button
                                                        type="button"
                                                        className="admin-view-button admin-view-button--danger"
                                                        onClick={() =>
                                                            handleDelete(
                                                                user
                                                            )
                                                        }
                                                        disabled={
                                                            deletingId ===
                                                                user.id ||
                                                            user.role ===
                                                                'admin'
                                                        }
                                                        title={
                                                            user.role ===
                                                            'admin'
                                                                ? 'Admin felhasználó nem törölhető.'
                                                                : 'Felhasználó törlése'
                                                        }
                                                    >
                                                        {deletingId ===
                                                        user.id
                                                            ? 'Törlés...'
                                                            : 'Törlés'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
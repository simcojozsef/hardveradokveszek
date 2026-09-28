import React, { useEffect, useMemo, useState } from 'react';

async function getAdminStores() {
    const response = await fetch(
        '/api/admin/stores',
        {
            headers: {
                Accept: 'application/json',
            },
            credentials: 'include',
        }
    );

    if (!response.ok) {
        throw new Error(
            'Nem sikerült betölteni az üzleteket.'
        );
    }

    return response.json();
}

export default function Stores() {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] =
        useState('all');

    useEffect(() => {
        async function loadStores() {
            try {
                setLoading(true);
                setError('');

                const response =
                    await getAdminStores();

                setStores(response.data ?? []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadStores();
    }, []);

    const filteredStores = useMemo(() => {
        const query = search.trim().toLowerCase();

        return stores.filter((store) => {
            const matchesSearch =
                !query ||
                store.name
                    ?.toLowerCase()
                    .includes(query) ||
                store.slug
                    ?.toLowerCase()
                    .includes(query) ||
                store.user?.name
                    ?.toLowerCase()
                    .includes(query);

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active'
                    ? store.is_active
                    : !store.is_active);

            return matchesSearch && matchesStatus;
        });
    }, [stores, search, statusFilter]);

    return (
        <div className="admin-page">
            <header className="admin-page__header">
                <div>
                    <p className="eyebrow">
                        Adminisztráció
                    </p>

                    <h1>Üzletek</h1>

                    <p className="admin-page__description">
                        Az eladók által létrehozott üzletek
                        kezelése.
                    </p>
                </div>

                <div className="admin-page__header-meta">
                    <strong>
                        {stores.length}
                    </strong>

                    <span>
                        üzlet
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
                        placeholder="Keresés üzlet vagy eladó alapján..."
                    />
                </div>

                <div className="admin-role-filters">
                    <button
                        type="button"
                        className={
                            statusFilter === 'all'
                                ? 'admin-filter-button admin-filter-button--active'
                                : 'admin-filter-button'
                        }
                        onClick={() =>
                            setStatusFilter('all')
                        }
                    >
                        Összes
                        <span>{stores.length}</span>
                    </button>

                    <button
                        type="button"
                        className={
                            statusFilter === 'active'
                                ? 'admin-filter-button admin-filter-button--active'
                                : 'admin-filter-button'
                        }
                        onClick={() =>
                            setStatusFilter('active')
                        }
                    >
                        Aktív
                        <span>
                            {
                                stores.filter(
                                    (store) =>
                                        store.is_active
                                ).length
                            }
                        </span>
                    </button>

                    <button
                        type="button"
                        className={
                            statusFilter === 'inactive'
                                ? 'admin-filter-button admin-filter-button--active'
                                : 'admin-filter-button'
                        }
                        onClick={() =>
                            setStatusFilter('inactive')
                        }
                    >
                        Inaktív
                        <span>
                            {
                                stores.filter(
                                    (store) =>
                                        !store.is_active
                                ).length
                            }
                        </span>
                    </button>
                </div>
            </section>

            <section className="dashboard-card admin-list-card">
                <div className="admin-list-card__header">
                    <div>
                        <p className="eyebrow">
                            Üzletek
                        </p>

                        <h2>
                            {filteredStores.length}{' '}
                            találat
                        </h2>
                    </div>
                </div>

                {loading ? (
                    <div className="admin-empty-state">
                        Üzletek betöltése...
                    </div>
                ) : filteredStores.length === 0 ? (
                    <div className="admin-empty-state">
                        <strong>
                            Nincs találat.
                        </strong>

                        <p>
                            Próbálj másik keresést vagy
                            szűrőt.
                        </p>
                    </div>
                ) : (
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Üzlet</th>
                                    <th>Eladó</th>
                                    <th>Slug</th>
                                    <th>Állapot</th>
                                    <th>Létrehozva</th>
                                    <th>Műveletek</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredStores.map(
                                    (store) => (
                                        <tr key={store.id}>
                                            <td>
                                                <div className="admin-store-cell">
                                                    <div className="admin-store-logo">
                                                        {store.logo ? (
                                                            <img
                                                                src={`/storage/${store.logo}`}
                                                                alt={
                                                                    store.name
                                                                }
                                                            />
                                                        ) : (
                                                            <span>
                                                                {store.name
                                                                    ?.charAt(
                                                                        0
                                                                    )
                                                                    ?.toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <strong>
                                                            {
                                                                store.name
                                                            }
                                                        </strong>

                                                        <span>
                                                            #{store.id}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>
                                                <div className="admin-table-person">
                                                    <strong>
                                                        {
                                                            store
                                                                .user
                                                                ?.name
                                                        }
                                                    </strong>

                                                    <span>
                                                        {
                                                            store
                                                                .user
                                                                ?.email
                                                        }
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                <code className="admin-code">
                                                    {
                                                        store.slug
                                                    }
                                                </code>
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        store.is_active
                                                            ? 'admin-status-badge admin-status-badge--active'
                                                            : 'admin-status-badge admin-status-badge--inactive'
                                                    }
                                                >
                                                    {store.is_active
                                                        ? 'Aktív'
                                                        : 'Inaktív'}
                                                </span>
                                            </td>

                                            <td>
                                                {new Date(
                                                    store.created_at
                                                ).toLocaleDateString('hu-HU')}
                                            </td>

                                            <td>
                                                <a
                                                    href={`/store/${store.slug}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="admin-view-button"
                                                >
                                                    Megtekintés →
                                                </a>
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
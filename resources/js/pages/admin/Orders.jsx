import React, { useEffect, useMemo, useState } from 'react';

async function getAdminOrders() {
    const response = await fetch(
        '/api/admin/orders',
        {
            headers: {
                Accept: 'application/json',
            },
            credentials: 'include',
        }
    );

    if (!response.ok) {
        throw new Error(
            'Nem sikerült betölteni a rendeléseket.'
        );
    }

    return response.json();
}

const statusLabels = {
    pending: 'Feldolgozás alatt',
    processing: 'Csomag kész',
    shipped: 'Feladva',
    completed: 'Kézbesítve',
};

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] =
        useState('all');

    useEffect(() => {
        async function loadOrders() {
            try {
                setLoading(true);
                setError('');

                const response =
                    await getAdminOrders();

                setOrders(response.data ?? []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadOrders();
    }, []);

    const filteredOrders = useMemo(() => {
        const query = search.trim().toLowerCase();

        return orders.filter((order) => {
            const matchesSearch =
                !query ||
                String(order.id)
                    .includes(query) ||
                order.buyer_name
                    ?.toLowerCase()
                    .includes(query) ||
                order.buyer_email
                    ?.toLowerCase()
                    .includes(query);

            const matchesStatus =
                statusFilter === 'all' ||
                order.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [orders, search, statusFilter]);

    const statusCounts = {
        all: orders.length,
        pending: orders.filter(
            (order) => order.status === 'pending'
        ).length,
        processing: orders.filter(
            (order) =>
                order.status === 'processing'
        ).length,
        shipped: orders.filter(
            (order) => order.status === 'shipped'
        ).length,
        completed: orders.filter(
            (order) =>
                order.status === 'completed'
        ).length,
    };

    return (
        <div className="admin-page">
            <header className="admin-page__header">
                <div>
                    <p className="eyebrow">
                        Adminisztráció
                    </p>

                    <h1>Rendelések</h1>

                    <p className="admin-page__description">
                        A teljes piactér rendeléseinek
                        áttekintése.
                    </p>
                </div>

                <div className="admin-page__header-meta">
                    <strong>
                        {orders.length}
                    </strong>

                    <span>
                        rendelés
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
                        placeholder="Keresés rendelés, név vagy e-mail alapján..."
                    />
                </div>

                <div className="admin-role-filters">
                    {[
                        ['all', 'Összes'],
                        ['pending', 'Feldolgozás'],
                        ['processing', 'Csomag kész'],
                        ['shipped', 'Feladva'],
                        ['completed', 'Kézbesítve'],
                    ].map(
                        ([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                className={
                                    statusFilter ===
                                    value
                                        ? 'seller-button admin-filter-button admin-filter-button--active'
                                        : 'seller-button admin-filter-button'
                                }
                                onClick={() =>
                                    setStatusFilter(
                                        value
                                    )
                                }
                            >
                                {label}
                                <span>
                                    {
                                        statusCounts[
                                            value
                                        ]
                                    }
                                </span>
                            </button>
                        )
                    )}
                </div>
            </section>

            <section className="dashboard-card admin-list-card">
                <div className="admin-list-card__header">
                    <div>
                        <p className="eyebrow">
                            Rendelési lista
                        </p>

                        <h2>
                            {filteredOrders.length}{' '}
                            találat
                        </h2>
                    </div>
                </div>

                {loading ? (
                    <div className="admin-empty-state">
                        Rendelések betöltése...
                    </div>
                ) : filteredOrders.length === 0 ? (
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
                                    <th>Rendelés</th>
                                    <th>Vásárló</th>
                                    <th>Üzletek</th>
                                    <th>Összeg</th>
                                    <th>Státusz</th>
                                    <th>Dátum</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredOrders.map(
                                    (order) => (
                                        <tr key={order.id}>
                                            <td>
                                                <span className="admin-id">
                                                    #{order.id}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="admin-table-person">
                                                    <strong>
                                                        {
                                                            order.buyer_name
                                                        }
                                                    </strong>

                                                    <span>
                                                        {
                                                            order.buyer_email
                                                        }
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                <div className="admin-order-stores">
                                                    {order
                                                        .seller_groups
                                                        ?.map(
                                                            (
                                                                group
                                                            ) => (
                                                                <span
                                                                    key={
                                                                        group.id
                                                                    }
                                                                    className="admin-store-pill"
                                                                >
                                                                    {
                                                                        group
                                                                            .store
                                                                            ?.name
                                                                    }
                                                                </span>
                                                            )
                                                        )}
                                                </div>
                                            </td>

                                            <td>
                                                <strong>
                                                    {Number(
                                                        order.total
                                                    ).toLocaleString(
                                                        'hu-HU'
                                                    )}{' '}
                                                    Ft
                                                </strong>
                                            </td>

                                            <td>
                                                <span
                                                    className={`admin-order-status admin-order-status--${order.status}`}
                                                >
                                                    {statusLabels[
                                                        order.status
                                                    ] ??
                                                        order.status}
                                                </span>
                                            </td>

                                            <td>
                                                {new Date(
                                                    order.created_at
                                                ).toLocaleDateString(
                                                    'hu-HU'
                                                )}
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
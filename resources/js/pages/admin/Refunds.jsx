import React, { useEffect, useMemo, useState } from 'react';

async function getAdminRefunds() {
    const response = await fetch(
        '/api/admin/refunds',
        {
            headers: {
                Accept: 'application/json',
            },
            credentials: 'include',
        }
    );

    if (!response.ok) {
        throw new Error(
            'Nem sikerült betölteni a visszatérítéseket.'
        );
    }

    return response.json();
}

const refundStatusLabels = {
    refund_requested:
        'Visszatérítés kérése',
    refund_completed:
        'Visszatérítés teljesítve',
};

export default function Refunds() {
    const [refunds, setRefunds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] =
        useState('all');

    useEffect(() => {
        async function loadRefunds() {
            try {
                setLoading(true);
                setError('');

                const response =
                    await getAdminRefunds();

                setRefunds(response.data ?? []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadRefunds();
    }, []);

    const filteredRefunds = useMemo(() => {
        const query = search.trim().toLowerCase();

        return refunds.filter((refund) => {
            const matchesSearch =
                !query ||
                String(refund.id)
                    .includes(query) ||
                refund.user?.name
                    ?.toLowerCase()
                    .includes(query) ||
                refund.user?.email
                    ?.toLowerCase()
                    .includes(query) ||
                refund.order_seller_group?.store
                    ?.name
                    ?.toLowerCase()
                    .includes(query);

            const matchesStatus =
                statusFilter === 'all' ||
                refund.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [refunds, search, statusFilter]);

    const requestedCount =
        refunds.filter(
            (refund) =>
                refund.status ===
                'refund_requested'
        ).length;

    const completedCount =
        refunds.filter(
            (refund) =>
                refund.status ===
                'refund_completed'
        ).length;

    return (
        <div className="admin-page">
            <header className="admin-page__header">
                <div>
                    <p className="eyebrow">
                        Adminisztráció
                    </p>

                    <h1>Visszatérítések</h1>

                    <p className="admin-page__description">
                        A vásárlók által kért
                        visszatérítések ellenőrzése.
                    </p>
                </div>

                <div className="admin-page__header-meta">
                    <strong>
                        {refunds.length}
                    </strong>

                    <span>
                        refund
                    </span>
                </div>
            </header>

            {error && (
                <div className="form-error">
                    {error}
                </div>
            )}

            <section className="admin-mini-stats">
                <div className="admin-mini-stat">
                    <span>
                        Függő
                    </span>

                    <strong>
                        {requestedCount}
                    </strong>
                </div>

                <div className="admin-mini-stat">
                    <span>
                        Teljesített
                    </span>

                    <strong>
                        {completedCount}
                    </strong>
                </div>
            </section>

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
                        placeholder="Keresés refund, vásárló vagy üzlet alapján..."
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
                        <span>
                            {refunds.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        className={
                            statusFilter ===
                            'refund_requested'
                                ? 'admin-filter-button admin-filter-button--active'
                                : 'admin-filter-button'
                        }
                        onClick={() =>
                            setStatusFilter(
                                'refund_requested'
                            )
                        }
                    >
                        Függő
                        <span>
                            {requestedCount}
                        </span>
                    </button>

                    <button
                        type="button"
                        className={
                            statusFilter ===
                            'refund_completed'
                                ? 'admin-filter-button admin-filter-button--active'
                                : 'admin-filter-button'
                        }
                        onClick={() =>
                            setStatusFilter(
                                'refund_completed'
                            )
                        }
                    >
                        Teljesített
                        <span>
                            {completedCount}
                        </span>
                    </button>
                </div>
            </section>

            <section className="dashboard-card admin-list-card">
                <div className="admin-list-card__header">
                    <div>
                        <p className="eyebrow">
                            Refund lista
                        </p>

                        <h2>
                            {filteredRefunds.length}{' '}
                            találat
                        </h2>
                    </div>
                </div>

                {loading ? (
                    <div className="admin-empty-state">
                        Visszatérítések betöltése...
                    </div>
                ) : filteredRefunds.length ===
                  0 ? (
                    <div className="admin-empty-state">
                        <strong>
                            Nincs találat.
                        </strong>

                        <p>
                            Jelenleg nincs a szűrésnek
                            megfelelő refund.
                        </p>
                    </div>
                ) : (
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Refund</th>
                                    <th>Vásárló</th>
                                    <th>Üzlet</th>
                                    <th>Rendelés</th>
                                    <th>Összeg</th>
                                    <th>Státusz</th>
                                    <th>Dátum</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredRefunds.map(
                                    (refund) => (
                                        <tr key={refund.id}>
                                            <td>
                                                <span className="admin-id">
                                                    #{refund.id}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="admin-table-person">
                                                    <strong>
                                                        {
                                                            refund
                                                                .user
                                                                ?.name
                                                        }
                                                    </strong>

                                                    <span>
                                                        {
                                                            refund
                                                                .user
                                                                ?.email
                                                        }
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                <strong>
                                                    {
                                                        refund
                                                            .order_seller_group
                                                            ?.store
                                                            ?.name
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                <span className="admin-id">
                                                    #
                                                    {
                                                        refund
                                                            .order_seller_group
                                                            ?.order_id
                                                    }
                                                </span>
                                            </td>

                                            <td>
                                                <strong>
                                                    {Number(
                                                        refund.amount
                                                    ).toLocaleString(
                                                        'hu-HU'
                                                    )}{' '}
                                                    Ft
                                                </strong>
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        refund.status ===
                                                        'refund_completed'
                                                            ? 'admin-status-badge admin-status-badge--active'
                                                            : 'admin-status-badge admin-status-badge--warning'
                                                    }
                                                >
                                                    {refundStatusLabels[
                                                        refund.status
                                                    ] ??
                                                        refund.status}
                                                </span>
                                            </td>

                                            <td>
                                                {refund.requested_at
                                                    ? new Date(
                                                          refund.requested_at
                                                      ).toLocaleDateString(
                                                          'hu-HU'
                                                      )
                                                    : '—'}
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
import React, { useEffect, useMemo, useState } from 'react';

const actionLabels = {
    'system.test': 'Rendszer teszt',
    'auth.login': 'Bejelentkezés',
    'auth.logout': 'Kijelentkezés',
    'auth.register': 'Regisztráció',
    'order.processing': 'Rendelés feldolgozása',
    'order.shipped': 'Rendelés feladva',
    'order.completed': 'Rendelés kézbesítve',
    'buyer.received': 'Kézbesítés visszaigazolva',
    'buyer.rejected': 'Kézbesítés elutasítva',
    'refund.requested': 'Visszatérítés kérése',
    'refund.completed': 'Visszatérítés teljesítve',
    'refund.proof_uploaded': 'Refund bizonylat feltöltve',
};

async function getAdminLogs(params = {}) {
    const searchParams = new URLSearchParams();

    if (params.search) {
        searchParams.set('search', params.search);
    }

    if (params.action !== 'all') {
        searchParams.set('action', params.action);
    }

    const query = searchParams.toString();

    const response = await fetch(
        `/api/admin/logs${query ? `?${query}` : ''}`,
        {
            headers: {
                Accept: 'application/json',
            },
            credentials: 'include',
        }
    );

    if (!response.ok) {
        throw new Error(
            'Nem sikerült betölteni a naplót.'
        );
    }

    return response.json();
}

function formatDate(value) {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleString(
        'hu-HU'
    );
}

function getSubjectLabel(log) {
    if (!log.subject_type || !log.subject_id) {
        return '—';
    }

    const type = log.subject_type.split('\\').pop();

    const labels = {
        Order: 'Rendelés',
        OrderSellerGroup: 'Seller rendelés',
        Refund: 'Refund',
        Product: 'Termék',
        Store: 'Üzlet',
        User: 'Felhasználó',
    };

    return `${labels[type] ?? type} #${log.subject_id}`;
}

export default function Logs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [action, setAction] = useState('all');

    async function loadLogs() {
        try {
            setLoading(true);
            setError('');

            const response = await getAdminLogs({
                search,
                action,
            });

            setLogs(response.data ?? []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadLogs();
    }, [action]);

    const actionOptions = useMemo(() => {
        const actions = [
            ...new Set(
                logs
                    .map((log) => log.action)
                    .filter(Boolean)
            ),
        ];

        return actions.sort();
    }, [logs]);

    function handleSearchSubmit(event) {
        event.preventDefault();
        loadLogs();
    }

    return (
        <div className="admin-page">
            <header className="admin-page__header">
                <div>
                    <p className="eyebrow">
                        Adminisztráció
                    </p>

                    <h1>Napló</h1>

                    <p className="admin-page__description">
                        A rendszerben végrehajtott műveletek
                        és események naplója.
                    </p>
                </div>

                <div className="admin-page__header-meta">
                    <strong>
                        {logs.length}
                    </strong>

                    <span>
                        bejegyzés
                    </span>
                </div>
            </header>

            {error && (
                <div className="form-error">
                    {error}
                </div>
            )}

            <section className="admin-filter-bar">
                <form
                    className="admin-search"
                    onSubmit={handleSearchSubmit}
                >
                    <input
                        type="search"
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value
                            )
                        }
                        placeholder="Keresés művelet vagy leírás alapján..."
                    />
                </form>

                <div className="admin-role-filters">
                    <select
                        value={action}
                        onChange={(event) =>
                            setAction(
                                event.target.value
                            )
                        }
                        className="admin-filter-select"
                    >
                        <option value="all">
                            Minden művelet
                        </option>

                        {actionOptions.map(
                            (item) => (
                                <option
                                    key={item}
                                    value={item}
                                >
                                    {actionLabels[
                                        item
                                    ] ?? item}
                                </option>
                            )
                        )}
                    </select>
                </div>
            </section>

            <section className="dashboard-card admin-list-card">
                <div className="admin-list-card__header">
                    <div>
                        <p className="eyebrow">
                            Események
                        </p>

                        <h2>
                            {logs.length} bejegyzés
                        </h2>
                    </div>
                </div>

                {loading ? (
                    <div className="admin-empty-state">
                        Napló betöltése...
                    </div>
                ) : logs.length === 0 ? (
                    <div className="admin-empty-state">
                        <strong>
                            Nincs naplóbejegyzés.
                        </strong>

                        <p>
                            A megadott szűrésre nincs
                            találat.
                        </p>
                    </div>
                ) : (
                    <div className="admin-table-wrapper">
                        <table className="admin-table admin-log-table">
                            <thead>
                                <tr>
                                    <th>Dátum</th>
                                    <th>Felhasználó</th>
                                    <th>Művelet</th>
                                    <th>Leírás</th>
                                    <th>Objektum</th>
                                    <th>IP</th>
                                </tr>
                            </thead>

                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id}>
                                        <td>
                                            <span className="admin-date">
                                                {formatDate(
                                                    log.created_at
                                                )}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="admin-table-person">
                                                <strong>
                                                    {
                                                        log
                                                            .user
                                                            ?.name
                                                    }
                                                </strong>

                                                <span>
                                                    {
                                                        log
                                                            .user
                                                            ?.email
                                                    }
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            <span className="admin-log-action">
                                                {
                                                    actionLabels[
                                                        log.action
                                                    ] ??
                                                        log.action
                                                }
                                            </span>
                                        </td>

                                        <td>
                                            <div className="admin-log-description">
                                                {
                                                    log.description
                                                }
                                            </div>
                                        </td>

                                        <td>
                                            <span className="admin-id">
                                                {getSubjectLabel(
                                                    log
                                                )}
                                            </span>
                                        </td>

                                        <td>
                                            <code className="admin-code">
                                                {
                                                    log.ip_address
                                                }
                                            </code>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
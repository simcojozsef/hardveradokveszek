import React, { useEffect, useState } from 'react';

async function getAdminDashboard() {
    const response = await fetch(
        '/api/admin/dashboard',
        {
            headers: {
                Accept: 'application/json',
            },
            credentials: 'include',
        }
    );

    if (!response.ok) {
        throw new Error(
            'Nem sikerült betölteni az admin vezérlőpultot.'
        );
    }

    return response.json();
}

function StatCard({
    label,
    value,
    secondary,
}) {
    return (
        <article className="admin-stat-card">
            <span className="admin-stat-card__label">
                {label}
            </span>

            <strong className="admin-stat-card__value">
                {value}
            </strong>

            {secondary && (
                <span className="admin-stat-card__secondary">
                    {secondary}
                </span>
            )}
        </article>
    );
}

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function loadDashboard() {
            try {
                setLoading(true);
                setError('');

                const response =
                    await getAdminDashboard();

                setStats(response.data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadDashboard();
    }, []);

    if (loading) {
        return (
            <div className="admin-page">
                <div className="admin-loading">
                    Admin vezérlőpult betöltése...
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <header className="admin-page__header">
                <div>
                    <p className="eyebrow">
                        Adminisztráció
                    </p>

                    <h1>Vezérlőpult</h1>

                    <p className="admin-page__description">
                        A piactér legfontosabb adatai egy
                        helyen.
                    </p>
                </div>
            </header>

            {error && (
                <div className="form-error">
                    {error}
                </div>
            )}

            {stats && (
                <>
                    <section className="admin-stats-grid">
                        <StatCard
                            label="Felhasználók"
                            value={stats.users}
                            secondary={`${stats.buyers} vásárló`}
                        />

                        <StatCard
                            label="Eladók"
                            value={stats.sellers}
                            secondary={`${stats.stores} üzlet`}
                        />

                        <StatCard
                            label="Termékek"
                            value={stats.products}
                            secondary={`${stats.active_products} aktív`}
                        />

                        <StatCard
                            label="Rendelések"
                            value={stats.orders}
                            secondary={`${stats.pending_orders} függő`}
                        />

                        <StatCard
                            label="Aktív üzletek"
                            value={stats.active_stores}
                            secondary={`Összesen ${stats.stores}`}
                        />

                        <StatCard
                            label="Adminok"
                            value={stats.admins}
                            secondary="Adminisztrátori fiókok"
                        />
                    </section>

                    <section className="admin-section">
                        <div className="admin-section__header">
                            <div>
                                <p className="eyebrow">
                                    Áttekintés
                                </p>

                                <h2>
                                    Figyelmet igénylő tételek
                                </h2>
                            </div>
                        </div>

                        <div className="admin-attention-grid">
                            <article className="admin-attention-card">
                                <div className="admin-attention-card__icon">
                                    !
                                </div>

                                <div>
                                    <span>
                                        Függő visszatérítések
                                    </span>

                                    <strong>
                                        {stats.refund_requests}
                                    </strong>

                                    <p>
                                        Olyan refundok, amelyek
                                        még feldolgozásra várnak.
                                    </p>
                                </div>
                            </article>

                            <article className="admin-attention-card">
                                <div className="admin-attention-card__icon">
                                    !
                                </div>

                                <div>
                                    <span>
                                        Függő rendelések
                                    </span>

                                    <strong>
                                        {stats.pending_orders}
                                    </strong>

                                    <p>
                                        Feldolgozásra váró
                                        rendelések.
                                    </p>
                                </div>
                            </article>

                            <article className="admin-attention-card">
                                <div className="admin-attention-card__icon">
                                    ✓
                                </div>

                                <div>
                                    <span>
                                        Teljesített refundok
                                    </span>

                                    <strong>
                                        {stats.completed_refunds}
                                    </strong>

                                    <p>
                                        Már sikeresen lezárt
                                        visszatérítések.
                                    </p>
                                </div>
                            </article>
                        </div>
                    </section>

                    <section className="admin-section">
                        <div className="admin-section__header">
                            <div>
                                <p className="eyebrow">
                                    Platform
                                </p>

                                <h2>
                                    Rendszer összesítő
                                </h2>
                            </div>
                        </div>

                        <div className="admin-summary-grid">
                            <div className="admin-summary-row">
                                <span>Vásárlók</span>
                                <strong>
                                    {stats.buyers}
                                </strong>
                            </div>

                            <div className="admin-summary-row">
                                <span>Eladók</span>
                                <strong>
                                    {stats.sellers}
                                </strong>
                            </div>

                            <div className="admin-summary-row">
                                <span>Üzletek</span>
                                <strong>
                                    {stats.stores}
                                </strong>
                            </div>

                            <div className="admin-summary-row">
                                <span>Aktív üzletek</span>
                                <strong>
                                    {stats.active_stores}
                                </strong>
                            </div>

                            <div className="admin-summary-row">
                                <span>Termékek</span>
                                <strong>
                                    {stats.products}
                                </strong>
                            </div>

                            <div className="admin-summary-row">
                                <span>Aktív termékek</span>
                                <strong>
                                    {stats.active_products}
                                </strong>
                            </div>

                            <div className="admin-summary-row">
                                <span>Rendelések</span>
                                <strong>
                                    {stats.orders}
                                </strong>
                            </div>

                            <div className="admin-summary-row">
                                <span>Adminok</span>
                                <strong>
                                    {stats.admins}
                                </strong>
                            </div>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
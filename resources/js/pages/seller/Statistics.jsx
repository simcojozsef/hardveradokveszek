import React, { useEffect, useState } from 'react';

import { getMyStatistics } from '../../api/seller';

import '../../../css/seller-statistics.css';

/*
 * Seller statistics.
 *
 * Every plan sees per-listing totals; the series is PRO. The response says
 * which parts are available, so a locked number is never shown as if it were
 * real — a zero we did not measure would be worse than an upsell.
 */
const RANGE_LABELS = {
    7: '7 nap',
    30: '30 nap',
    90: '90 nap',
};

export default function Statistics() {
    const [data, setData] = useState(null);
    const [days, setDays] = useState(30);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        getMyStatistics(days)
            .then((response) => {
                if (!cancelled) setData(response.data);
            })
            .catch((err) => {
                if (!cancelled) setError(err.message || 'A statisztika nem tölthető be.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [days]);

    if (loading && !data) {
        return (
            <div className="seller-page">
                <p className="stats-state">Statisztika betöltése...</p>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="seller-page">
                <p className="stats-state stats-state--error" role="alert">{error}</p>
            </div>
        );
    }

    const advanced = data?.advanced;
    const peak = advanced?.series?.length
        ? Math.max(...advanced.series.map((point) => point.views), 1)
        : 1;

    return (
        <div className="seller-page seller-stats">
            <header className="seller-page__header">
                <div>
                    <p className="eyebrow">Statisztika</p>
                    <h1>Megtekintések</h1>
                </div>

                {data?.has_advanced && (
                    <div className="stats-ranges">
                        {data.preset_ranges.map((value) => (
                            <button
                                key={value}
                                type="button"
                                className={`secondary-button ${days === value ? 'is-active' : ''}`}
                                onClick={() => setDays(value)}
                            >
                                {RANGE_LABELS[value] ?? `${value} nap`}
                            </button>
                        ))}
                    </div>
                )}
            </header>

            {/* Per-listing totals: the free-plan view, and the PRO baseline. */}
            <section className="stats-card">
                <h2>Hirdetéseid</h2>

                {data?.listing_totals?.length ? (
                    <div className="stats-table-wrap">
                        <table className="stats-table">
                            <thead>
                                <tr>
                                    <th>Hirdetés</th>
                                    <th>Megtekintés</th>
                                    {data.has_advanced && <th>Érdeklődő beszélgetés</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {data.listing_totals.map((row) => (
                                    <tr key={row.product_id}>
                                        <td>{row.name}</td>
                                        <td><strong>{row.views}</strong></td>
                                        {data.has_advanced && (
                                            <td>{row.interested_conversations}</td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="stats-hint">Még nincs mérhető megtekintés.</p>
                )}
            </section>

            {data?.has_advanced ? (
                <section className="stats-card">
                    <h2>Időszaki bontás ({advanced?.range?.days} nap)</h2>

                    <div className="stats-summary">
                        <div>
                            <span>Összes megtekintés</span>
                            <strong>{advanced?.total_views ?? 0}</strong>
                        </div>
                        <div>
                            <span>Érdeklődő beszélgetés</span>
                            <strong>{advanced?.interested_conversations ?? 0}</strong>
                        </div>
                    </div>

                    {advanced?.series?.length ? (
                        <div className="stats-chart" aria-hidden="true">
                            {advanced.series.map((point) => (
                                <div
                                    key={point.day}
                                    className="stats-chart__bar"
                                    style={{ height: `${Math.max(4, (point.views / peak) * 100)}%` }}
                                    title={`${point.day}: ${point.views}`}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="stats-hint">
                            Ebben az időszakban nincs rögzített megtekintés.
                        </p>
                    )}
                </section>
            ) : (
                <section className="stats-card stats-card--locked">
                    <h2>Időszaki bontás</h2>
                    <p className="stats-hint">
                        A 7 / 30 / 90 napos idősor és az érdeklődő beszélgetések
                        száma a <strong>PRO</strong> csomag része.
                    </p>
                </section>
            )}

            <p className="stats-note">
                A megtekintések névtelenül, egy rövid életű munkamenet-azonosító
                alapján számolódnak. Ugyanaz a látogató egy hirdetést 24 órán
                belül egyszer növel, és a saját megtekintésed nem számít.
            </p>
        </div>
    );
}

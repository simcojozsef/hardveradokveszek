import React, {
    useEffect,
    useState,
} from 'react';

async function getAdminAnalytics(days) {
    const response = await fetch(
        `/api/admin/analytics?days=${days}`,
        {
            headers: {
                Accept: 'application/json',
            },
            credentials: 'include',
        }
    );

    if (!response.ok) {
        throw new Error(
            'Nem sikerült betölteni az analitikát.'
        );
    }

    return response.json();
}

function StatCard({
    label,
    value,
}) {
    return (
        <article className="admin-stat-card">
            <span className="admin-stat-card__label">
                {label}
            </span>

            <strong className="admin-stat-card__value">
                {value}
            </strong>
        </article>
    );
}

function AnalyticsChart({ daily }) {
    const width = 1000;
    const height = 400;

    const padding = {
        top: 40,
        right: 35,
        bottom: 60,
        left: 60,
    };

    const chartWidth =
        width -
        padding.left -
        padding.right;

    const chartHeight =
        height -
        padding.top -
        padding.bottom;

    if (!daily || daily.length === 0) {
        return (
            <div className="analytics-chart-empty">
                <strong>
                    Még nincs analitikai adat.
                </strong>

                <p>
                    Amint látogatások érkeznek,
                    a grafikon itt fog megjelenni.
                </p>
            </div>
        );
    }

    const series = [
        {
            key: 'visitors',
            label: 'Látogatók',
            color: '#2563eb',
        },
        {
            key: 'page_views',
            label: 'Oldalmegnyitások',
            color: '#7c3aed',
        },
        {
            key: 'product_views',
            label: 'Termékmegnyitások',
            color: '#059669',
        },
        {
            key: 'store_views',
            label: 'Üzletmegnyitások',
            color: '#d97706',
        },
    ];

    const maxValue = Math.max(
        1,
        ...daily.flatMap((item) =>
            series.map(
                (seriesItem) =>
                    Number(
                        item[
                            seriesItem.key
                        ]
                    ) || 0
            )
        )
    );

    const graphMax = Math.max(
        maxValue,
        4
    );

    function getX(index) {
        if (daily.length === 1) {
            return (
                padding.left +
                chartWidth / 2
            );
        }

        return (
            padding.left +
            (index /
                (daily.length - 1)) *
                chartWidth
        );
    }

    function getY(value) {
        return (
            padding.top +
            chartHeight -
            (value / graphMax) *
                chartHeight
        );
    }

    function getPoints(key) {
        return daily
            .map((item, index) => {
                return `${getX(index)},${getY(
                    Number(item[key]) || 0
                )}`;
            })
            .join(' ');
    }

    function formatDate(dateString) {
        const date = new Date(
            `${dateString}T00:00:00`
        );

        return date.toLocaleDateString(
            'hu-HU',
            {
                month: 'short',
                day: 'numeric',
            }
        );
    }

    return (
        <div className="analytics-chart">
            <div className="analytics-chart__legend">
                {series.map((item) => (
                    <div
                        key={item.key}
                        className="analytics-chart__legend-item"
                    >
                        <span
                            className="analytics-chart__legend-dot"
                            style={{
                                backgroundColor:
                                    item.color,
                            }}
                        />

                        <span>
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>

            <div className="analytics-chart__container">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="analytics-chart__svg"
                    aria-label="Napi analitika"
                    role="img"
                >
                    {Array.from(
                        {
                            length: 5,
                        },
                        (_, index) => {
                            const value =
                                (graphMax /
                                    4) *
                                index;

                            const lineY =
                                getY(value);

                            return (
                                <g
                                    key={`grid-${index}`}
                                >
                                    <line
                                        x1={
                                            padding.left
                                        }
                                        x2={
                                            width -
                                            padding.right
                                        }
                                        y1={
                                            lineY
                                        }
                                        y2={
                                            lineY
                                        }
                                        stroke="#e5e7eb"
                                        strokeWidth="1"
                                    />

                                    <text
                                        x={
                                            padding.left -
                                            10
                                        }
                                        y={
                                            lineY +
                                            4
                                        }
                                        textAnchor="end"
                                        fill="#6b7280"
                                        fontSize="12"
                                    >
                                        {Math.round(
                                            value
                                        )}
                                    </text>
                                </g>
                            );
                        }
                    )}

                    {series.map((item) => (
                        <g key={item.key}>
                            <polyline
                                points={getPoints(
                                    item.key
                                )}
                                fill="none"
                                stroke={
                                    item.color
                                }
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />

                            {daily.map(
                                (
                                    day,
                                    index
                                ) => {
                                    const value =
                                        Number(
                                            day[
                                                item
                                                    .key
                                            ]
                                        ) || 0;

                                    return (
                                        <circle
                                            key={`${item.key}-${day.date}`}
                                            cx={getX(
                                                index
                                            )}
                                            cy={getY(
                                                value
                                            )}
                                            r="5"
                                            fill={
                                                item.color
                                            }
                                        />
                                    );
                                }
                            )}
                        </g>
                    ))}

                    {daily.map(
                        (day, index) => (
                            <text
                                key={day.date}
                                x={getX(
                                    index
                                )}
                                y={
                                    height -
                                    22
                                }
                                textAnchor="middle"
                                fill="#6b7280"
                                fontSize="12"
                            >
                                {formatDate(
                                    day.date
                                )}
                            </text>
                        )
                    )}
                </svg>
            </div>
        </div>
    );
}

function formatChartDate(value) {
    if (!value) {
        return '';
    }

    const date = new Date(
        `${value}T00:00:00`
    );

    return date.toLocaleDateString(
        'hu-HU',
        {
            month: 'short',
            day: 'numeric',
        }
    );
}

export default function Analytics() {
    const [days, setDays] = useState(7);
    const [data, setData] = useState(null);
    const [loading, setLoading] =
        useState(true);
    const [error, setError] = useState('');

    async function loadAnalytics() {
        try {
            setLoading(true);
            setError('');

            const response =
                await getAdminAnalytics(days);

            setData(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadAnalytics();
    }, [days]);

    return (
        <div className="admin-page">
            <header className="admin-page__header">
                <div>
                    <p className="eyebrow">
                        Adminisztráció
                    </p>

                    <h1>Analitika</h1>

                    <p className="admin-page__description">
                        A piactér látogatottsági és
                        megtekintési adatai.
                    </p>
                </div>
            </header>

            {error && (
                <div className="form-error">
                    {error}
                </div>
            )}

            {/* Időszak */}
            <section className="admin-filter-bar">
                <div>
                    <strong>
                        Időszak
                    </strong>
                </div>

                <div className="admin-role-filters">
                    {[7, 30, 90].map(
                        (value) => (
                            <button
                                key={value}
                                type="button"
                                className={
                                    days === value
                                        ? 'admin-filter-button admin-filter-button--active'
                                        : 'admin-filter-button'
                                }
                                onClick={() =>
                                    setDays(value)
                                }
                            >
                                {value} nap
                            </button>
                        )
                    )}
                </div>
            </section>

            {loading ? (
                <div className="admin-loading">
                    Analitika betöltése...
                </div>
            ) : data ? (
                <>
                    {/* Grafikon */}
                    <section className="dashboard-card analytics-chart-card">
                        <div className="admin-list-card__header">
                            <div>
                                <p className="eyebrow">
                                    Forgalom
                                </p>

                                <h2>
                                    Napi aktivitás
                                </h2>

                                <p className="admin-page__description">
                                    Látogatók és
                                    megtekintések az
                                    utolsó {days} napban.
                                </p>
                            </div>
                        </div>

                        <AnalyticsChart
                            daily={data.daily}
                        />
                    </section>

                    {/* Összesítő kártyák */}
                    <section className="admin-stats-grid">
                        <StatCard
                            label="Főoldal betöltések"
                            value={data.summary.home_page_loads}
                        />

                        <StatCard
                            label="Főoldal látogatói"
                            value={data.summary.home_page_visitors}
                        />
                        <StatCard
                            label="Látogatók"
                            value={
                                data.summary
                                    .visitors
                            }
                        />

                        <StatCard
                            label="Oldalmegnyitások"
                            value={
                                data.summary
                                    .page_views
                            }
                        />

                        <StatCard
                            label="Termékmegnyitások"
                            value={
                                data.summary
                                    .product_views
                            }
                        />

                        <StatCard
                            label="Üzletmegnyitások"
                            value={
                                data.summary
                                    .store_views
                            }
                        />
                    </section>

                    {/* Megnézett URL-ek */}
                    <section className="dashboard-card analytics-list-card">
                        <div className="admin-list-card__header">
                            <div>
                                <p className="eyebrow">
                                    Oldalak
                                </p>

                                <h2>
                                    Megnézett URL-ek
                                </h2>

                                <p className="admin-page__description">
                                    A leggyakrabban
                                    megnyitott oldalak az
                                    elmúlt {days} napban.
                                </p>
                            </div>
                        </div>

                        {data.pages?.length > 0 ? (
                            <div className="analytics-url-list">
                                {data.pages.map(
                                    (page) => (
                                        <div
                                            key={
                                                page.url
                                            }
                                            className="analytics-url-row"
                                        >
                                            <div className="analytics-url-row__path">
                                                <code>
                                                    {
                                                        page.url
                                                    }
                                                </code>
                                            </div>

                                            <div className="analytics-url-row__views">
                                                <strong>
                                                    {Number(
                                                        page.views
                                                    ).toLocaleString(
                                                        'hu-HU'
                                                    )}
                                                </strong>

                                                <span>
                                                    megtekintés
                                                </span>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        ) : (
                            <div className="analytics-chart-empty">
                                <strong>
                                    Még nincs
                                    oldalmegtekintés.
                                </strong>

                                <p>
                                    Amint látogatók
                                    böngésznek az
                                    oldalon, az URL-ek
                                    itt jelennek meg.
                                </p>
                            </div>
                        )}
                    </section>

                    {/* Legnézettebb termékek és üzletek */}
                    <section className="analytics-ranking-grid">
                        {/* Termékek */}
                        <section className="dashboard-card analytics-list-card">
                            <div className="admin-list-card__header">
                                <div>
                                    <p className="eyebrow">
                                        Termékek
                                    </p>

                                    <h2>
                                        Legnézettebb
                                        termékek
                                    </h2>
                                </div>
                            </div>

                            {data.products?.length >
                            0 ? (
                                <div className="analytics-ranking-list">
                                    {data.products.map(
                                        (
                                            product,
                                            index
                                        ) => (
                                            <div
                                                key={
                                                    product.id
                                                }
                                                className="analytics-ranking-row"
                                            >
                                                <div className="analytics-ranking-row__position">
                                                    {
                                                        index +
                                                            1
                                                    }
                                                </div>

                                                <div className="analytics-ranking-row__content">
                                                    <strong>
                                                        {
                                                            product.name
                                                        }
                                                    </strong>

                                                    <span>
                                                        Termék
                                                        #
                                                        {
                                                            product.id
                                                        }
                                                    </span>
                                                </div>

                                                <strong className="analytics-ranking-row__value">
                                                    {Number(
                                                        product.views
                                                    ).toLocaleString(
                                                        'hu-HU'
                                                    )}
                                                </strong>
                                            </div>
                                        )
                                    )}
                                </div>
                            ) : (
                                <div className="analytics-chart-empty">
                                    <strong>
                                        Még nincs
                                        termékmegtekintés.
                                    </strong>

                                    <p>
                                        Amint termékeket
                                        tekintenek meg, itt
                                        megjelennek.
                                    </p>
                                </div>
                            )}
                        </section>

                        {/* Üzletek */}
                        <section className="dashboard-card analytics-list-card">
                            <div className="admin-list-card__header">
                                <div>
                                    <p className="eyebrow">
                                        Üzletek
                                    </p>

                                    <h2>
                                        Legnézettebb
                                        üzletek
                                    </h2>
                                </div>
                            </div>

                            {data.stores?.length >
                            0 ? (
                                <div className="analytics-ranking-list">
                                    {data.stores.map(
                                        (
                                            store,
                                            index
                                        ) => (
                                            <div
                                                key={
                                                    store.id
                                                }
                                                className="analytics-ranking-row"
                                            >
                                                <div className="analytics-ranking-row__position">
                                                    {
                                                        index +
                                                            1
                                                    }
                                                </div>

                                                <div className="analytics-ranking-row__content">
                                                    <strong>
                                                        {
                                                            store.name
                                                        }
                                                    </strong>

                                                    <span>
                                                        Üzlet
                                                        #
                                                        {
                                                            store.id
                                                        }
                                                    </span>
                                                </div>

                                                <strong className="analytics-ranking-row__value">
                                                    {Number(
                                                        store.views
                                                    ).toLocaleString(
                                                        'hu-HU'
                                                    )}
                                                </strong>
                                            </div>
                                        )
                                    )}
                                </div>
                            ) : (
                                <div className="analytics-chart-empty">
                                    <strong>
                                        Még nincs
                                        üzletmegtekintés.
                                    </strong>

                                    <p>
                                        Amint üzleteket
                                        tekintenek meg, itt
                                        megjelennek.
                                    </p>
                                </div>
                            )}
                        </section>
                    </section>
                </>
            ) : null}
        </div>
    );
}
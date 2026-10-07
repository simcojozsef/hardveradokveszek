import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getStores } from '../api/stores';
import '../../css/stores-directory.css';

export default function Stores() {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function loadStores() {
            setLoading(true);
            setError(null);

            try {
                const response = await getStores();
                if (!cancelled) {
                    setStores(
                        Array.isArray(response?.data) ? response.data : []
                    );
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || 'A boltok nem tölthetők be.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadStores();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <main className="page stores-page">
            <header className="stores-page__header">
                <div>
                    <p className="eyebrow">GigaPiac</p>
                    <h1>Boltok</h1>
                    <p className="stores-page__lead">
                        Böngéssz a piactér eladói között, és nézd meg a
                        kínálatukat.
                    </p>
                </div>
                <div className="stores-page__icon" aria-hidden="true">
                    🏪
                </div>
            </header>

            {loading && (
                <div className="stores-state" role="status">
                    <strong>Boltok betöltése...</strong>
                </div>
            )}

            {!loading && error && (
                <div className="stores-state stores-state--error" role="alert">
                    <strong>Nem sikerült betölteni a boltokat.</strong>
                    <p>{error}</p>
                </div>
            )}

            {!loading && !error && stores.length === 0 && (
                <div className="stores-state">
                    <strong>Még nincs elérhető bolt.</strong>
                </div>
            )}

            {!loading && !error && stores.length > 0 && (
                <section className="stores-grid">
                    {stores.map((store) => (
                        <Link
                            key={store.id}
                            to={`/store/${store.slug}`}
                            className="store-card"
                        >
                            <div className="store-card__logo">
                                {store.logo ? (
                                    <img
                                        src={store.logo}
                                        alt={store.name}
                                        loading="lazy"
                                    />
                                ) : (
                                    <span aria-hidden="true">🏪</span>
                                )}
                            </div>

                            <div className="store-card__body">
                                <h2>{store.name}</h2>

                                {store.description && (
                                    <p className="store-card__description">
                                        {store.description}
                                    </p>
                                )}

                                <div className="store-card__meta">
                                    <span className="product-store-rating">
                                        <span
                                            className="product-store-rating__positive"
                                            aria-label="Pozitív értékelések"
                                        >
                                            +{Number(
                                                store.positive_ratings_count ??
                                                    0
                                            )}
                                        </span>
                                        <span
                                            className="product-store-rating__negative"
                                            aria-label="Negatív értékelések"
                                        >
                                            −{Number(
                                                store.negative_ratings_count ??
                                                    0
                                            )}
                                        </span>
                                    </span>

                                    <span className="store-card__arrow">
                                        →
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </section>
            )}
        </main>
    );
}

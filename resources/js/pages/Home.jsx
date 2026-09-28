import React, {
    useEffect,
    useState,
} from 'react';

import Hero from '../components/Hero';

function formatPrice(value) {
    return `${Number(value || 0).toLocaleString(
        'hu-HU',
    )} Ft`;
}

function getStockLabel(stock) {
    const quantity = Number(stock);

    if (quantity <= 0) {
        return 'Elfogyott';
    }

    if (quantity === 1) {
        return '1 db elérhető';
    }

    return `${quantity} db elérhető`;
}

function getStockClass(stock) {
    const quantity = Number(stock);

    if (quantity <= 0) {
        return 'home-product-card__stock home-product-card__stock--empty';
    }

    if (quantity <= 2) {
        return 'home-product-card__stock home-product-card__stock--low';
    }

    return 'home-product-card__stock';
}

export default function Home() {
    const [search, setSearch] =
        useState('');

    const [submittedSearch, setSubmittedSearch] =
        useState('');

    const [products, setProducts] =
        useState([]);

    const [pagination, setPagination] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState('');

    const [page, setPage] =
        useState(1);

    async function loadProducts(
        currentPage = 1,
        currentSearch = submittedSearch,
    ) {
        try {
            setLoading(true);
            setError('');

            const params =
                new URLSearchParams();

            params.set(
                'page',
                currentPage,
            );

            params.set(
                'per_page',
                '24',
            );

            if (currentSearch.trim()) {
                params.set(
                    'search',
                    currentSearch.trim(),
                );
            }

            const response =
                await fetch(
                    `/api/products?${params.toString()}`,
                    {
                        headers: {
                            Accept:
                                'application/json',
                        },
                    },
                );

            if (!response.ok) {
                throw new Error(
                    'Nem sikerült betölteni a termékeket.',
                );
            }

            const data =
                await response.json();

            setProducts(
                Array.isArray(data.data)
                    ? data.data
                    : [],
            );

            setPagination(
                data.meta ?? null,
            );
        } catch (err) {
            console.error(
                'HOME PRODUCTS ERROR:',
                err,
            );

            setError(
                err.message ||
                    'Hiba történt a termékek betöltése közben.',
            );

            setProducts([]);
            setPagination(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadProducts(1, '');
    }, []);

    function handleSearch(event) {
        event?.preventDefault();

        setSubmittedSearch(search);
        setPage(1);

        loadProducts(
            1,
            search,
        );
    }

    function handleClearSearch() {
        setSearch('');
        setSubmittedSearch('');
        setPage(1);

        loadProducts(
            1,
            '',
        );
    }

    function handlePageChange(
        newPage,
    ) {
        setPage(newPage);

        loadProducts(
            newPage,
            submittedSearch,
        );

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    }

    return (
        <main className="home-page">
            <Hero
                search={search}
                setSearch={setSearch}
                onSearch={handleSearch}
            />

            <section className="home-products">
                <div id="home-products__inner" className="home-products__inner">

                    <div className="home-products__header">
                        <div>

                            <h2>
                                {submittedSearch
                                    ? `Találatok erre: „${submittedSearch}”`
                                    : 'Termékek'}
                            </h2>

                            {!loading &&
                                !error &&
                                pagination && (
                                    <p className="home-products__subtitle">
                                        {Number(
                                            pagination.total ||
                                                0,
                                        ).toLocaleString(
                                            'hu-HU',
                                        )}{' '}
                                        aktív termék
                                    </p>
                                )}
                        </div>

                        {!loading &&
                            !error &&
                            pagination && (
                                <div className="home-products__count">
                                    <strong>
                                        {Number(
                                            pagination.total ||
                                                0,
                                        ).toLocaleString(
                                            'hu-HU',
                                        )}
                                    </strong>

                                    <span>
                                        termék
                                    </span>
                                </div>
                            )}
                    </div>

                    {error && (
                        <div className="home-products__state home-products__state--error">
                            <div className="home-products__state-icon">
                                !
                            </div>

                            <strong>
                                Nem sikerült betölteni a
                                termékeket.
                            </strong>

                            <p>
                                {error}
                            </p>

                            <button
                                type="button"
                                className="button"
                                onClick={() =>
                                    loadProducts(
                                        page,
                                        submittedSearch,
                                    )
                                }
                            >
                                Újrapróbálás
                            </button>
                        </div>
                    )}

                    {loading && !error && (
                        <div className="home-products__state">
                            <div className="home-products__spinner" />

                            <strong>
                                Termékek betöltése...
                            </strong>

                            <p>
                                Egy pillanat.
                            </p>
                        </div>
                    )}

                    {!loading &&
                        !error &&
                        products.length === 0 && (
                            <div className="home-products__state">
                                <div className="home-products__state-icon">
                                    🔎
                                </div>

                                <strong>
                                    Nincs találat.
                                </strong>

                                <p>
                                    Nem találtunk a
                                    keresésednek megfelelő
                                    aktív terméket.
                                </p>

                                {submittedSearch && (
                                    <button
                                        type="button"
                                        className="secondary-button"
                                        onClick={
                                            handleClearSearch
                                        }
                                    >
                                        Összes termék
                                    </button>
                                )}
                            </div>
                        )}

                    {!loading &&
                        !error &&
                        products.length > 0 && (
                            <>
                                <div className="home-product-grid">
                                    {products.map(
                                        (product) => (
                                            <a
                                                key={
                                                    product.id
                                                }
                                                href={`/product/${product.id}`}
                                                className="home-product-card"
                                            >
                                                <div className="home-product-card__image">
                                                    {product.image ? (
                                                        <img
                                                            src={
                                                                product.image
                                                            }
                                                            alt={
                                                                product.name
                                                            }
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div className="home-product-card__no-image">
                                                            <span>
                                                                📦
                                                            </span>

                                                            <small>
                                                                Nincs kép
                                                            </small>
                                                        </div>
                                                    )}

                                                    <span
                                                        className={getStockClass(
                                                            product.stock,
                                                        )}
                                                    >
                                                        {getStockLabel(
                                                            product.stock,
                                                        )}
                                                    </span>
                                                </div>

                                                <div className="home-product-card__body">
                                                    {product.store && (
                                                        <div className="home-product-card__store">
                                                            <span>
                                                                🏪
                                                            </span>

                                                            <span>
                                                                {
                                                                    product
                                                                        .store
                                                                        .name
                                                                }
                                                            </span>
                                                        </div>
                                                    )}

                                                    <h3>
                                                        {
                                                            product.name
                                                        }
                                                    </h3>

                                                    {product.description && (
                                                        <p className="home-product-card__description">
                                                            {
                                                                product.description
                                                            }
                                                        </p>
                                                    )}

                                                    <div className="home-product-card__footer">
                                                        <strong>
                                                            {formatPrice(
                                                                product.price,
                                                            )}
                                                        </strong>

                                                        <span className="home-product-card__arrow">
                                                            →
                                                        </span>
                                                    </div>
                                                </div>
                                            </a>
                                        ),
                                    )}
                                </div>

                                {pagination &&
                                    Number(
                                        pagination.last_page,
                                    ) > 1 && (
                                        <nav className="home-pagination">
                                            <button
                                                type="button"
                                                disabled={
                                                    page <=
                                                    1
                                                }
                                                onClick={() =>
                                                    handlePageChange(
                                                        page -
                                                            1,
                                                    )
                                                }
                                            >
                                                ← Előző
                                            </button>

                                            <span>
                                                {page}{' '}
                                                /{' '}
                                                {
                                                    pagination.last_page
                                                }
                                            </span>

                                            <button
                                                type="button"
                                                disabled={
                                                    page >=
                                                    Number(
                                                        pagination.last_page,
                                                    )
                                                }
                                                onClick={() =>
                                                    handlePageChange(
                                                        page +
                                                            1,
                                                    )
                                                }
                                            >
                                                Következő →
                                            </button>
                                        </nav>
                                    )}
                            </>
                        )}

                </div>
            </section>
        </main>
    );
}
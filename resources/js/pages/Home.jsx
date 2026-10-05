import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import Hero from '../components/Hero';
import useMarketplaceSearch from '../hooks/useMarketplaceSearch';
import { getTopCategories } from '../api/categories';
import { getCategoryIcon } from '../utils/categoryIcons';
function isOtherCategory(category) {
    const name = String(category?.name ?? '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    return name === 'egyeb' || name.startsWith('egyeb ');
}
export default function Home() {
    const { search, setSearch, filters, setFilters, products, pagination, loading, error,
        page, submittedSearch, hasFilters, handleSearch, handleClearSearch, handlePageChange,
        retryProducts } = useMarketplaceSearch();
    const [topCategories, setTopCategories] = useState([]);
    useEffect(() => {
        let cancelled = false;
        async function loadTopCategories() {
            try {
                const response = await getTopCategories();
                const categories = Array.isArray(response?.data)
                    ? [...response.data]
                    : [];
                categories.sort((a, b) => {
                    const aIsOther = isOtherCategory(a);
                    const bIsOther = isOtherCategory(b);
                    return aIsOther === bIsOther ? 0 : aIsOther ? 1 : -1;
                });
                if (!cancelled) setTopCategories(categories);
            } catch (categoryError) {
                console.error('HOME CATEGORIES ERROR:', categoryError);
                if (!cancelled) setTopCategories([]);
            }
        }
        loadTopCategories();
        return () => {
            cancelled = true;
        };
    }, []);
    return (
        <main className="page category-page">
            <Hero
                search={search}
                setSearch={setSearch}
                onSearch={handleSearch}
                filters={filters}
                setFilters={setFilters}
            />
            {topCategories.length > 0 && (
                <nav className="category-main-nav" aria-label="Fő kategóriák">
                    {topCategories.map((category) => (
                        <Link
                            key={category.id}
                            to={`/${category.slug}`}
                            className="category-main-nav__item"
                        >
                            <img
                                src={getCategoryIcon(category.icon, category.icon_key)}
                                alt=""
                            />
                            <span>{category.name}</span>
                        </Link>
                    ))}
                </nav>
            )}
            <section className="category-browser">
                <div className="category-browser__header">
                    <div>
                        <p className="eyebrow">Kategóriák</p>
                    </div>
                </div>
                <div className="category-grid">
                    {topCategories.map((category) => (
                        <Link
                            key={category.id}
                            to={`/${category.slug}`}
                            className="category-tile"
                        >
                            <img
                                src={getCategoryIcon(category.icon, category.icon_key)}
                                alt=""
                            />
                            <span>{category.name}</span>
                            <span className="category-tile__arrow" aria-hidden="true">→</span>
                        </Link>
                    ))}
                </div>
            </section>
            <section className="category-products">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">Termékek</p>
                        <h2 className="category-products__title">
                            {submittedSearch
                                ? `Találatok erre: „${submittedSearch}”`
                                : 'Termékek'}
                        </h2>
                    </div>
                    {!loading && !error && pagination && (
                        <span>
                            {Number(pagination.total || 0).toLocaleString('hu-HU')} találat
                        </span>
                    )}
                </div>
                {hasFilters && <button type="button" className="secondary-button" onClick={handleClearSearch}>Szűrők törlése</button>}
                {error && (
                    <div className="category-empty" role="alert">
                        <strong>{error}</strong>
                        <button
                            type="button"
                            className="button"
                            onClick={retryProducts}
                        >
                            Újrapróbálás
                        </button>
                    </div>
                )}
                {loading && !error && (
                    <div className="category-empty" role="status">
                        <strong>Termékek betöltése...</strong>
                    </div>
                )}
                {!loading && !error && products.length === 0 && (
                    <div className="category-empty">
                        <strong>Nincs találat.</strong>
                        {hasFilters && (
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={handleClearSearch}
                            >
                                Összes termék
                            </button>
                        )}
                    </div>
                )}
                {!loading && !error && products.length > 0 && (
                    <>
                        <div className="product-grid">
                            {products.map((product) => (
                                <Link
                                    key={product.id}
                                    to={`/product/${product.id}`}
                                    className="category-product-card"
                                >
                                    <div className="category-product-card__image">
                                        {product.image ? (
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <span>Nincs kép</span>
                                        )}
                                    </div>
                                    <div className="category-product-card__body">
                                        <h3>{product.name}</h3>
                                        {product.store && (
                                            <span className="category-product-card__store">
                                                {product.store.name}

                                                <span className="product-store-rating">
                                                    <span
                                                        className="product-store-rating__positive"
                                                        aria-label="Pozitív értékelések"
                                                    >
                                                        +{Number(product.store.positive_ratings_count ?? 0)}
                                                    </span>

                                                    <span
                                                        className="product-store-rating__negative"
                                                        aria-label="Negatív értékelések"
                                                    >
                                                        −{Number(product.store.negative_ratings_count ?? 0)}
                                                    </span>
                                                </span>
                                            </span>
                                        )}
                                        <strong>
                                            {Number(product.price || 0).toLocaleString('hu-HU')} Ft
                                        </strong>
                                    </div>
                                </Link>
                            ))}
                        </div>
                        {pagination && Number(pagination.last_page) > 1 && (
                            <nav className="home-pagination" aria-label="Termékoldalak">
                                <button
                                    type="button"
                                    disabled={page <= 1}
                                    onClick={() => handlePageChange(page - 1)}
                                >
                                    ← Előző
                                </button>
                                <span>{page} / {pagination.last_page}</span>
                                <button
                                    type="button"
                                    disabled={page >= Number(pagination.last_page)}
                                    onClick={() => handlePageChange(page + 1)}
                                >
                                    Következő →
                                </button>
                            </nav>
                        )}
                    </>
                )}
            </section>
        </main>
    );
}

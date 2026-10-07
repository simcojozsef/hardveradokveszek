import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import Hero from '../components/Hero';
import PostListingButton from '../components/PostListingButton';
import ProductCardMeta from '../components/ProductCardMeta';
import { listingStatus } from '../utils/productLifecycle';
import useMarketplaceSearch, { PRODUCTS_ANCHOR_ID } from '../hooks/useMarketplaceSearch';
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
function formatCount(value) {
    return Number(value || 0).toLocaleString('hu-HU');
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
        <main className="page category-page home-page">
            {/* ========================================================== */}
            {/* Hero band: search first, with a short promise and the CTA  */}
            {/* ========================================================== */}
            <section className="home-hero-band">
                <div className="home-hero-band__intro">
                    <p className="eyebrow">Hardver adásvétel</p>
                    <h1 className="home-hero-band__title">
                        Találd meg a következő hardvered!
                    </h1>
                    <p className="home-hero-band__lead">
                        Processzorok, kártyák, alaplapok és komplett gépek —
                        egyenesen a hazai eladóktól. Böngéssz kategóriákra,
                        vagy írj rá az eladóra pár kattintással.
                    </p>
                </div>

                <Hero
                    search={search}
                    setSearch={setSearch}
                    onSearch={handleSearch}
                    filters={filters}
                    setFilters={setFilters}
                />

                <div className="home-hero-band__actions">
                    <PostListingButton />
                    <span className="home-hero-band__hint">
                        Pár perc alatt feladhatod az első hirdetésed.
                    </span>
                </div>
            </section>
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
            {/* ========================================================== */}
            {/* Category browser                                            */}
            {/* ========================================================== */}
            <section className="category-browser">
                <div className="category-browser__header">
                    <div>
                        <p className="eyebrow">Kategóriák</p>
                        <h2>Böngéssz témák szerint</h2>
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
            <section className="category-products home-products" id={PRODUCTS_ANCHOR_ID}>
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">Termékek</p>
                        <h2 className="category-products__title">
                            {submittedSearch
                                ? `Találatok erre: „${submittedSearch}”`
                                : 'Friss hirdetések'}
                        </h2>
                    </div>
                    {!loading && !error && pagination && (
                        <span className="home-products__count">
                            {formatCount(pagination.total)} találat
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

                                        {listingStatus(product) === 'in_progress' && (
                                            <span className="product-listing-badge product-listing-badge--reserved product-listing-badge--overlay">
                                                Foglalt
                                            </span>
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
                                            {formatCount(product.price)} Ft
                                        </strong>

                                        <ProductCardMeta product={product} />
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

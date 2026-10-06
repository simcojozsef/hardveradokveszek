import React, {
    useEffect,
    useState,
} from 'react';
import {
    Link,
    useParams,
} from 'react-router';
import {
    getCategory,
    getTopCategories,
    getCategoryTree,
} from '../api/categories';
import { getCategoryIcon } from '../utils/categoryIcons';
import Hero from '../components/Hero';
import PostListingButton from '../components/PostListingButton';
import ProductCardMeta from '../components/ProductCardMeta';
import { useAuth } from '../context/AuthContext';
import useMarketplaceSearch, { PRODUCTS_ANCHOR_ID } from '../hooks/useMarketplaceSearch';
import { getCategoryScopeIds } from '../utils/marketplaceFilters';
export default function Category() {
    const params = useParams();
    const { user, isAuthenticated } = useAuth();
    /*
    |--------------------------------------------------------------------------
    | React Router
    |--------------------------------------------------------------------------
    */
    const categoryPath = [
        params.categoryPath,
        params['*'],
    ]
        .filter(Boolean)
        .join('/');
    /*
    |--------------------------------------------------------------------------
    | State
    |--------------------------------------------------------------------------
    */
    const [data, setData] = useState(null);
    const [topCategories, setTopCategories] =
        useState([]);
    const [loading, setLoading] =
        useState(true);
    const [error, setError] = useState('');
    const categoryIds = data?.loadedPath === categoryPath ? data.scopeIds : null;
    const marketplace = useMarketplaceSearch({ categoryIds });
    /*
    |--------------------------------------------------------------------------
    | Load current category
    |--------------------------------------------------------------------------
    */
    useEffect(() => {
        let cancelled = false;
        async function loadCategory() {
            try {
                setLoading(true);
                setError('');
                setData(null);
                const [response, treeResponse] = await Promise.all([
                    getCategory(categoryPath), getCategoryTree(),
                ]);
                const categoryData = response?.data;
                if (!categoryData?.category) {
                    if (!cancelled) setData(null);
                    return;
                }
                const scopeIds = getCategoryScopeIds(treeResponse.data, categoryData.category.id);
                if (!cancelled) setData({ ...categoryData, scopeIds, loadedPath: categoryPath });
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.message ??
                        'Nem sikerült betölteni a kategóriát.'
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }
        if (categoryPath) {
            loadCategory();
        } else {
            setLoading(false);
        }
        return () => {
            cancelled = true;
        };
    }, [categoryPath]);
    /*
    |--------------------------------------------------------------------------
    | Load top-level categories
    |--------------------------------------------------------------------------
    */
    useEffect(() => {
        let cancelled = false;
        async function loadTopCategories() {
            try {
                const response =
                    await getTopCategories();
                if (!cancelled) {
                    const categories =
                        Array.isArray(response?.data)
                            ? [...response.data]
                            : [];
                    const isEgyeb = (category) => {
                        const name = String(
                            category?.name ?? ''
                        )
                            .trim()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .toLowerCase();
                        return name === 'egyeb';
                    };
                    categories.sort((a, b) => {
                        const aIsEgyeb = isEgyeb(a);
                        const bIsEgyeb = isEgyeb(b);
                        if (aIsEgyeb && !bIsEgyeb) {
                            return 1;
                        }
                        if (!aIsEgyeb && bIsEgyeb) {
                            return -1;
                        }
                        return 0;
                    });
                    setTopCategories(categories);
                }
            } catch {
                if (!cancelled) {
                    setTopCategories([]);
                }
            }
        }
        loadTopCategories();
        return () => {
            cancelled = true;
        };
    }, []);
    /*
    |--------------------------------------------------------------------------
    | Conditional rendering
    |--------------------------------------------------------------------------
    */
    if (loading) {
        return (
            <main className="page">
                Betöltés...
            </main>
        );
    }
    if (error) {
        return (
            <main className="page">
                <h1>Hiba</h1>
                <p>{error}</p>
                <Link to="/">
                    ← Vissza a címlapra
                </Link>
            </main>
        );
    }
    if (!data || !data.category) {
        return (
            <main className="page">
                <h1>
                    A kategória nem található.
                </h1>
                <Link to="/">
                    ← Vissza a címlapra
                </Link>
            </main>
        );
    }
    /*
    |--------------------------------------------------------------------------
    | Normalize API collections
    |--------------------------------------------------------------------------
    */
    const breadcrumb =
        Array.isArray(data.breadcrumb)
            ? data.breadcrumb
            : [];
    const children =
        Array.isArray(data.children)
            ? (() => {
                const isEgyeb = (category) => {
                    const name = String(category?.name ?? '')
                        .trim()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .toLowerCase();
                    return (
                        name === 'egyeb' ||
                        name.startsWith('egyeb ')
                    );
                };
                const normalChildren =
                    data.children.filter(
                        (category) => !isEgyeb(category)
                    );
                const egyebChildren =
                    data.children.filter(
                        (category) => isEgyeb(category)
                    );
                return [
                    ...normalChildren,
                    ...egyebChildren,
                ];
            })()
            : [];
    const products = {
        data: marketplace.products,
        total: marketplace.pagination?.total ?? 0,
    };
    const hasChildren =
        children.length > 0;
    /*
    |--------------------------------------------------------------------------
    | Contextual listing CTA
    |--------------------------------------------------------------------------
    | The call to action carries the category the visitor is browsing so a new
    | listing is naturally filed under the same branch of the tree.
    */
    const listingPath = isAuthenticated
        ? `${user?.store ? '/seller/products/create' : '/seller/store/create'}?category=${encodeURIComponent(data.category.slug)}`
        : `/register?category=${encodeURIComponent(data.category.slug)}`;
    const listingLabel = isAuthenticated && user?.store
        ? 'Hirdetés feladása ide'
        : 'Hirdetésfeladás';
    /*
    |--------------------------------------------------------------------------
    | Breadcrumb URL helper
    |--------------------------------------------------------------------------
    */
    function breadcrumbPath(index) {
        return (
            '/' +
            breadcrumb
                .slice(0, index + 1)
                .map(
                    (item) => item.slug
                )
                .join('/')
        );
    }
    /*
    |--------------------------------------------------------------------------
    | Product list
    |--------------------------------------------------------------------------
    */
    function renderProducts() {
        return (
            <>
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">
                            Termékek
                        </p>
                        <h2>
                            {data.category.name}{' '}
                            termékek
                        </h2>
                    </div>
                    <span>
                        {Number(
                            products.total
                        ).toLocaleString(
                            'hu-HU'
                        )}{' '}
                        találat
                    </span>
                </div>
                {marketplace.hasFilters && (
                    <button type="button" className="secondary-button" onClick={marketplace.handleClearSearch}>Szűrők törlése</button>
                )}
                {marketplace.error ? (
                    <div className="category-empty" role="alert">
                        <strong>{marketplace.error}</strong>
                        <button type="button" className="button" onClick={marketplace.retryProducts}>Újrapróbálás</button>
                    </div>
                ) : marketplace.loading ? (
                    <div className="category-empty" role="status"><strong>Termékek betöltése...</strong></div>
                ) : products.data.length === 0 ? (
                    <div className="category-empty">
                        <strong>
                            Nincs találat ebben a kategóriában.
                        </strong>
                    </div>
                ) : (
                    <div className="product-grid">
                        {products.data.map(
                            (product) => (
                                <Link
                                    key={
                                        product.id
                                    }
                                    to={`/product/${product.id}`}
                                    className="category-product-card"
                                >
                                    <div className="category-product-card__image">
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
                                            <span>
                                                Nincs
                                                kép
                                            </span>
                                        )}
                                    </div>
                                    <div className="category-product-card__body">
                                        <h3>
                                            {
                                                product.name
                                            }
                                        </h3>
                                        {product.store && (
                                            <span className="category-product-card__store">
                                                {
                                                    product
                                                        .store
                                                        .name
                                                }
                                            </span>
                                        )}
                                        <strong>
                                            {Number(
                                                product.price
                                            ).toLocaleString(
                                                'hu-HU'
                                            )}{' '}
                                            Ft
                                        </strong>

                                        <ProductCardMeta product={product} />
                                    </div>
                                </Link>
                            )
                        )}
                    </div>
                )}
                {!marketplace.loading && !marketplace.error && Number(marketplace.pagination?.last_page) > 1 && (
                    <nav className="home-pagination" aria-label="Termékoldalak">
                        <button type="button" disabled={marketplace.page <= 1}
                            onClick={() => marketplace.handlePageChange(marketplace.page - 1)}>← Előző</button>
                        <span>{marketplace.page} / {marketplace.pagination.last_page}</span>
                        <button type="button" disabled={marketplace.page >= Number(marketplace.pagination.last_page)}
                            onClick={() => marketplace.handlePageChange(marketplace.page + 1)}>Következő →</button>
                    </nav>
                )}
            </>
        );
    }
    /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
    */
    return (
        <main className="page category-page">
            <Hero
                search={marketplace.search}
                setSearch={marketplace.setSearch}
                onSearch={marketplace.handleSearch}
                filters={marketplace.filters}
                setFilters={marketplace.setFilters}
            />
            {/* ========================================================== */}
            {/* Top-level category navigation                              */}
            {/* ========================================================== */}
            <nav
                className="category-main-nav"
                aria-label="Fő kategóriák"
            >
                {topCategories.map(
                    (category) => {
                        const isActive =
                            category.id ===
                            breadcrumb[0]?.id;
                        return (
                            <Link
                                key={
                                    category.id
                                }
                                to={`/${category.slug}`}
                                className={
                                    isActive
                                        ? 'category-main-nav__item category-main-nav__item--active'
                                        : 'category-main-nav__item'
                                }
                            >
                                <img
                                    src={getCategoryIcon(
                                        category.icon,
                                        category.icon_key
                                    )}
                                    alt=""
                                />
                                <span>
                                    {
                                        category.name
                                    }
                                </span>
                            </Link>
                        );
                    }
                )}
            </nav>
            {/* ========================================================== */}
            {/* Breadcrumb                                                   */}
            {/* ========================================================== */}
            <nav
                className="category-breadcrumb"
                aria-label="Morzsaút"
            >
                <Link to="/">
                    Kezdőlap
                </Link>
                {breadcrumb.map(
                    (item, index) => (
                        <React.Fragment
                            key={
                                item.id
                            }
                        >
                            <span>
                                →
                            </span>
                            {index ===
                            breadcrumb.length - 1 ? (
                                <strong>
                                    {
                                        item.name
                                    }
                                </strong>
                            ) : (
                                <Link
                                    to={breadcrumbPath(
                                        index
                                    )}
                                >
                                    {
                                        item.name
                                    }
                                </Link>
                            )}
                        </React.Fragment>
                    )
                )}
            </nav>
            <header className="category-hero-header">
                <div className="category-hero-header__meta">
                    <div className="category-hero-header__icon" aria-hidden="true">
                        <img
                            src={getCategoryIcon(data.category.icon, data.category.icon_key)}
                            alt=""
                        />
                    </div>
                    <div>
                        <p className="eyebrow">{
                            breadcrumb.length > 1
                                ? breadcrumb[breadcrumb.length - 2].name
                                : 'Kategória'
                        }</p>
                        <h1 className="category-hero-header__title">
                            {data.category.name}
                        </h1>
                        <p className="category-hero-header__stats">
                            {marketplace.loading
                                ? 'Találatok betöltése...'
                                : <>
                                    <strong>
                                        {Number(products.total).toLocaleString('hu-HU')}
                                    </strong>
                                    {' '}aktív hirdetés
                                    {hasChildren && (
                                        <>{' · '}{children.length} alkategória</>
                                    )}
                                </>
                            }
                        </p>
                    </div>
                </div>

                <Link to={listingPath} className="post-listing-button">
                    {listingLabel}
                </Link>
            </header>
            {/* ========================================================== */}
            {/* Category browser                                             */}
            {/* ========================================================== */}
            <section className="category-browser">
                <div className="category-browser__header">
                    <div>
                        <p className="eyebrow">
                            Alkategóriák
                        </p>
                        <h2>
                            {
                                data.category
                                    .name
                            }
                        </h2>
                    </div>
                </div>
                {hasChildren ? (
                    <div className="category-grid">
                        {children.map(
                            (child) => (
                                <Link
                                    key={
                                        child.id
                                    }
                                    to={`/${categoryPath}/${child.slug}`}
                                    className="category-tile"
                                >
                                    <img
                                        src={getCategoryIcon(
                                            child.icon,
                                            child.icon_key
                                        )}
                                        alt=""
                                    />
                                    <span>
                                        {
                                            child.name
                                        }
                                    </span>
                                    <span className="category-tile__arrow">
                                        →
                                    </span>
                                </Link>
                            )
                        )}
                    </div>
                ) : (
                    /*
                    |--------------------------------------------------------------------------
                    | Leaf category:
                    | Products are displayed directly inside the white category container.
                    |--------------------------------------------------------------------------
                    */
                    <div className="category-browser__products" id={PRODUCTS_ANCHOR_ID}>
                        {renderProducts()}
                    </div>
                )}
            </section>
            {/* ========================================================== */}
            {/* Products for categories that have children                  */}
            {/* ========================================================== */}
            {hasChildren && (
                <section className="category-products" id={PRODUCTS_ANCHOR_ID}>
                    {renderProducts()}
                </section>
            )}
        </main>
    );
}

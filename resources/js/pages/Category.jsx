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
} from '../api/categories';

import { getCategoryIcon } from '../utils/categoryIcons';

export default function Category() {
    const params = useParams();

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

                const response =
                    await getCategory(
                        categoryPath
                    );

                if (!cancelled) {
                    setData(
                        response?.data ?? null
                    );
                }
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


    const products =
        data.products &&
        Array.isArray(data.products.data)
            ? data.products
            : {
                data: [],
                total: 0,
            };

    const hasChildren =
        children.length > 0;

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

                {products.data.length === 0 ? (
                    <div className="category-empty">
                        <strong>
                            Nincs még termék
                            ebben a kategóriában.
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
                                    </div>
                                </Link>
                            )
                        )}
                    </div>
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

            {/* ========================================================== */}
            {/* Category browser                                             */}
            {/* ========================================================== */}

            <section className="category-browser">

                <div className="category-browser__header">
                    <div>
                        <p className="eyebrow">
                            Kategória
                        </p>

                        <h1>
                            {
                                data.category
                                    .name
                            }
                        </h1>
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
                    <div className="category-browser__products">
                        {renderProducts()}
                    </div>
                )}
            </section>

            {/* ========================================================== */}
            {/* Products for categories that have children                  */}
            {/* ========================================================== */}

            {hasChildren && (
                <section className="category-products">
                    {renderProducts()}
                </section>
            )}
        </main>
    );
}
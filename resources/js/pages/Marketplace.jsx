import React, {
    useEffect,
    useState,
} from 'react';
import {
    Link,
    useNavigate,
    useSearchParams,
} from 'react-router';
import ProductListingMeta from '../components/ProductListingMeta';

function formatPrice(value) {
    return `${Number(value || 0).toLocaleString(
        'hu-HU'
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
        return 'marketplace-product-card__stock marketplace-product-card__stock--empty';
    }
    if (quantity <= 2) {
        return 'marketplace-product-card__stock marketplace-product-card__stock--low';
    }
    return 'marketplace-product-card__stock';
}
export default function Marketplace() {
    const navigate = useNavigate();
    const [searchParams] =
        useSearchParams();
    const searchQuery =
        (searchParams.get('q') ?? searchParams.get('search') ?? '').trim();
    const requestQuery = searchParams.toString();
    const currentPage = Math.max(
        Number(searchParams.get('page')) || 1,
        1
    );
    const [searchInput, setSearchInput] =
        useState(searchQuery);
    const [products, setProducts] =
        useState([]);
    const [meta, setMeta] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 24,
        total: 0,
        from: 0,
        to: 0,
    });
    const [loading, setLoading] =
        useState(true);
    const [error, setError] =
        useState('');
    useEffect(() => {
        setSearchInput(searchQuery);
    }, [searchQuery]);
    useEffect(() => {
        const controller = new AbortController();
        async function loadProducts() {
            try {
                setLoading(true);
                setError('');
                const params =
                    new URLSearchParams(requestQuery);
                params.delete('q');
                if (searchQuery) {
                    params.set(
                        'search',
                        searchQuery
                    );
                }
                params.set(
                    'page',
                    String(currentPage)
                );
                params.set(
                    'per_page',
                    '24'
                );
                const response =
                    await fetch(
                        `/api/products?${params.toString()}`,
                        {
                            headers: {
                                Accept:
                                    'application/json',
                            },
                            credentials:
                                'include',
                            signal: controller.signal,
                        }
                    );
                if (!response.ok) {
                    throw new Error(
                        'Nem sikerült betölteni a termékeket.'
                    );
                }
                const data =
                    await response.json();
                setProducts(
                    Array.isArray(data.data)
                        ? data.data
                        : []
                );
                setMeta(
                    data.meta ?? {
                        current_page: 1,
                        last_page: 1,
                        per_page: 24,
                        total: 0,
                        from: 0,
                        to: 0,
                    }
                );
            } catch (err) {
                if (controller.signal.aborted) return;
                console.error(
                    'MARKETPLACE ERROR:',
                    err
                );
                setError(
                    err.message ||
                    'Hiba történt a termékek betöltése közben.'
                );
                setProducts([]);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }
        loadProducts();
        return () => controller.abort();
    }, [
        searchQuery,
        currentPage,
        requestQuery,
    ]);
    function handleSearchSubmit(event) {
        event.preventDefault();
        const value =
            searchInput.trim();
        const params = new URLSearchParams(searchParams);
        params.delete('page');
        params.delete('search');
        params.delete('q');
        if (value) params.set('q', value);
        navigate(`/search${params.toString() ? `?${params}` : ''}`);
    }
    function handlePageChange(page) {
        if (
            page < 1 ||
            page > Number(meta.last_page || 1)
        ) {
            return;
        }
        const params =
            new URLSearchParams(searchParams);
        if (searchQuery) {
            params.set(
                'q',
                searchQuery
            );
        }
        params.set(
            'page',
            String(page)
        );
        navigate(
            `/search?${params.toString()}`
        );
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    }
    function renderPagination() {
        const lastPage =
            Number(meta.last_page || 1);
        const page =
            Number(meta.current_page || 1);
        if (lastPage <= 1) {
            return null;
        }
        const pages = [];
        let start = Math.max(
            1,
            page - 2
        );
        let end = Math.min(
            lastPage,
            page + 2
        );
        if (page <= 3) {
            end = Math.min(
                lastPage,
                5
            );
        }
        if (page >= lastPage - 2) {
            start = Math.max(
                1,
                lastPage - 4
            );
        }
        for (
            let index = start;
            index <= end;
            index++
        ) {
            pages.push(index);
        }
        return (
            <nav
                className="marketplace-pagination"
                aria-label="Oldalak"
            >
                <button
                    type="button"
                    className="marketplace-pagination__button"
                    disabled={page <= 1}
                    onClick={() =>
                        handlePageChange(
                            page - 1
                        )
                    }
                >
                    ←
                </button>
                {start > 1 && (
                    <>
                        <button
                            type="button"
                            className="marketplace-pagination__button"
                            onClick={() =>
                                handlePageChange(
                                    1
                                )
                            }
                        >
                            1
                        </button>
                        {start > 2 && (
                            <span className="marketplace-pagination__dots">
                                …
                            </span>
                        )}
                    </>
                )}
                {pages.map(
                    (pageNumber) => (
                        <button
                            key={pageNumber}
                            type="button"
                            className={
                                pageNumber ===
                                page
                                    ? 'marketplace-pagination__button marketplace-pagination__button--active'
                                    : 'marketplace-pagination__button'
                            }
                            onClick={() =>
                                handlePageChange(
                                    pageNumber
                                )
                            }
                        >
                            {pageNumber}
                        </button>
                    )
                )}
                {end < lastPage && (
                    <>
                        {end <
                            lastPage -
                                1 && (
                            <span className="marketplace-pagination__dots">
                                …
                            </span>
                        )}
                        <button
                            type="button"
                            className="marketplace-pagination__button"
                            onClick={() =>
                                handlePageChange(
                                    lastPage
                                )
                            }
                        >
                            {lastPage}
                        </button>
                    </>
                )}
                <button
                    type="button"
                    className="marketplace-pagination__button"
                    disabled={
                        page >= lastPage
                    }
                    onClick={() =>
                        handlePageChange(
                            page + 1
                        )
                    }
                >
                    →
                </button>
            </nav>
        );
    }
    return (
        <main className="page marketplace-page">
            <header className="marketplace-header">
                <div>
                    <p className="eyebrow">
                        HardverAdokVeszek
                    </p>
                    <h1>
                        Piactér
                    </h1>
                    <p className="marketplace-header__description">
                        Böngéssz a piactér
                        aktív termékei között.
                    </p>
                </div>
                <div className="marketplace-header__icon">
                    🛒
                </div>
            </header>
            <section className="marketplace-search-card">
                <form
                    className="marketplace-search"
                    onSubmit={
                        handleSearchSubmit
                    }
                >
                    <div className="marketplace-search__field">
                        <span
                            className="marketplace-search__icon"
                            aria-hidden="true"
                        >
                            🔎
                        </span>
                        <input
                            type="search"
                            value={searchInput}
                            onChange={(event) =>
                                setSearchInput(
                                    event.target
                                        .value
                                )
                            }
                            placeholder="Mit keresel? Pl. RTX, alaplap, iPhone..."
                            aria-label="Termék keresése"
                        />
                        {searchInput && (
                            <button
                                type="button"
                                className="marketplace-search__clear"
                                onClick={() =>
                                    setSearchInput(
                                        ''
                                    )
                                }
                                aria-label="Keresés törlése"
                            >
                                ×
                            </button>
                        )}
                    </div>
                    <button
                        type="submit"
                        className="marketplace-search__submit"
                    >
                        Keresés
                    </button>
                </form>
            </section>
            <section className="marketplace-results">
                <div className="marketplace-results__header">
                    <div>
                        <p className="eyebrow">
                            Termékek
                        </p>
                        <h2>
                            {searchQuery
                                ? `Találatok erre: „${searchQuery}”`
                                : 'Legújabb termékek'}
                        </h2>
                    </div>
                    {!loading &&
                        !error && (
                            <div className="marketplace-results__count">
                                <strong>
                                    {Number(
                                        meta.total ||
                                            0
                                    ).toLocaleString(
                                        'hu-HU'
                                    )}
                                </strong>{' '}
                                termék
                            </div>
                        )}
                </div>
                {loading && (
                    <div className="marketplace-state">
                        <div className="marketplace-spinner" />
                        <strong>
                            Termékek betöltése...
                        </strong>
                        <p>
                            Egy pillanat.
                        </p>
                    </div>
                )}
                {!loading && error && (
                    <div className="marketplace-state marketplace-state--error">
                        <div className="marketplace-state__icon">
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
                                window.location.reload()
                            }
                        >
                            Újrapróbálás
                        </button>
                    </div>
                )}
                {!loading &&
                    !error &&
                    products.length === 0 && (
                        <div className="marketplace-state">
                            <div className="marketplace-state__icon">
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
                            <Link
                                to="/search"
                                className="secondary-button"
                            >
                                Összes termék
                            </Link>
                        </div>
                    )}
                {!loading &&
                    !error &&
                    products.length > 0 && (
                        <>
                            <div className="marketplace-product-grid">
                                {products.map(
                                    (product) => (
                                        <Link
                                            key={
                                                product.id
                                            }
                                            to={`/product/${product.id}`}
                                            className="marketplace-product-card"
                                        >
                                            <div className="marketplace-product-card__image">
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
                                                    <div className="marketplace-product-card__no-image">
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
                                                        product.stock
                                                    )}
                                                >
                                                    {getStockLabel(
                                                        product.stock
                                                    )}
                                                </span>
                                            </div>
                                            <div className="marketplace-product-card__body">
                                                <div className="marketplace-product-card__store">
                                                    {product.store ? (
                                                        <>
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
                                                        </>
                                                    ) : (
                                                        <span>
                                                            Piactéri eladó
                                                        </span>
                                                    )}
                                                </div>
                                                <h3>
                                                    {
                                                        product.name
                                                    }
                                                </h3>
                                                <ProductListingMeta product={product} />
                                                {product.description && (
                                                    <p className="marketplace-product-card__description">
                                                        {
                                                            product.description
                                                        }
                                                    </p>
                                                )}
                                                <div className="marketplace-product-card__footer">
                                                    <strong>
                                                        {formatPrice(
                                                            product.price
                                                        )}
                                                    </strong>
                                                    <span className="marketplace-product-card__arrow">
                                                        →
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    )
                                )}
                            </div>
                            {renderPagination()}
                        </>
                    )}
            </section>
        </main>
    );
}
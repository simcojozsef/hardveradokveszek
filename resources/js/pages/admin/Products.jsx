import React, { useEffect, useMemo, useState } from 'react';

async function getAdminProducts() {
    const response = await fetch(
        '/api/admin/products',
        {
            headers: {
                Accept: 'application/json',
            },
            credentials: 'include',
        }
    );

    if (!response.ok) {
        throw new Error(
            'Nem sikerült betölteni a termékeket.'
        );
    }

    return response.json();
}

export default function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] =
        useState('all');

    useEffect(() => {
        async function loadProducts() {
            try {
                setLoading(true);
                setError('');

                const response =
                    await getAdminProducts();

                setProducts(response.data ?? []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadProducts();
    }, []);

    const filteredProducts = useMemo(() => {
        const query = search.trim().toLowerCase();

        return products.filter((product) => {
            const matchesSearch =
                !query ||
                product.name
                    ?.toLowerCase()
                    .includes(query) ||
                product.store?.name
                    ?.toLowerCase()
                    .includes(query);

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active'
                    ? product.is_active
                    : !product.is_active);

            return matchesSearch && matchesStatus;
        });
    }, [products, search, statusFilter]);

    return (
        <div className="admin-page">
            <header className="admin-page__header">
                <div>
                    <p className="eyebrow">
                        Adminisztráció
                    </p>

                    <h1>Termékek</h1>

                    <p className="admin-page__description">
                        A piactéren elérhető termékek
                        áttekintése.
                    </p>
                </div>

                <div className="admin-page__header-meta">
                    <strong>
                        {products.length}
                    </strong>

                    <span>
                        termék
                    </span>
                </div>
            </header>

            {error && (
                <div className="form-error">
                    {error}
                </div>
            )}

            <section className="admin-filter-bar">
                <div className="admin-search">
                    <input
                        type="search"
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value
                            )
                        }
                        placeholder="Keresés termék vagy üzlet alapján..."
                    />
                </div>

                <div className="admin-role-filters">
                    <button
                        type="button"
                        className={
                            statusFilter === 'all'
                                ? 'admin-filter-button admin-filter-button--active'
                                : 'admin-filter-button'
                        }
                        onClick={() =>
                            setStatusFilter('all')
                        }
                    >
                        Összes
                        <span>{products.length}</span>
                    </button>

                    <button
                        type="button"
                        className={
                            statusFilter === 'active'
                                ? 'admin-filter-button admin-filter-button--active'
                                : 'admin-filter-button'
                        }
                        onClick={() =>
                            setStatusFilter('active')
                        }
                    >
                        Aktív
                        <span>
                            {
                                products.filter(
                                    (product) =>
                                        product.is_active
                                ).length
                            }
                        </span>
                    </button>

                    <button
                        type="button"
                        className={
                            statusFilter === 'inactive'
                                ? 'admin-filter-button admin-filter-button--active'
                                : 'admin-filter-button'
                        }
                        onClick={() =>
                            setStatusFilter('inactive')
                        }
                    >
                        Inaktív
                        <span>
                            {
                                products.filter(
                                    (product) =>
                                        !product.is_active
                                ).length
                            }
                        </span>
                    </button>
                </div>
            </section>

            <section className="dashboard-card admin-list-card">
                <div className="admin-list-card__header">
                    <div>
                        <p className="eyebrow">
                            Terméklista
                        </p>

                        <h2>
                            {filteredProducts.length}{' '}
                            találat
                        </h2>
                    </div>
                </div>

                {loading ? (
                    <div className="admin-empty-state">
                        Termékek betöltése...
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="admin-empty-state">
                        <strong>
                            Nincs találat.
                        </strong>

                        <p>
                            Próbálj másik keresést vagy
                            szűrőt.
                        </p>
                    </div>
                ) : (
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Termék</th>
                                    <th>Üzlet</th>
                                    <th>Ár</th>
                                    <th>Készlet</th>
                                    <th>Állapot</th>
                                    <th>Műveletek</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredProducts.map(
                                    (product) => (
                                        <tr key={product.id}>
                                            <td>
                                                <div className="admin-product-cell">
                                                    <div className="admin-product-thumb">
                                                        {product.image ? (
                                                            <img
                                                                src={
                                                                    product.image
                                                                }
                                                                alt={
                                                                    product.name
                                                                }
                                                            />
                                                        ) : (
                                                            <span>
                                                                Nincs kép
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <strong>
                                                            {
                                                                product.name
                                                            }
                                                        </strong>

                                                        <span>
                                                            #{product.id}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>
                                                <strong>
                                                    {
                                                        product
                                                            .store
                                                            ?.name
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                <strong>
                                                    {Number(
                                                        product.price
                                                    ).toLocaleString(
                                                        'hu-HU'
                                                    )}{' '}
                                                    Ft
                                                </strong>
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        product.stock ===
                                                        0
                                                            ? 'admin-stock-badge admin-stock-badge--empty'
                                                            : product.stock <=
                                                              3
                                                            ? 'admin-stock-badge admin-stock-badge--low'
                                                            : 'admin-stock-badge'
                                                    }
                                                >
                                                    {
                                                        product.stock
                                                    }{' '}
                                                    db
                                                </span>
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        product.is_active
                                                            ? 'admin-status-badge admin-status-badge--active'
                                                            : 'admin-status-badge admin-status-badge--inactive'
                                                    }
                                                >
                                                    {product.is_active
                                                        ? 'Aktív'
                                                        : 'Inaktív'}
                                                </span>
                                            </td>

                                            <td>
                                                <a
                                                    href={`/product/${product.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="admin-view-button"
                                                >
                                                    Megtekintés →
                                                </a>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
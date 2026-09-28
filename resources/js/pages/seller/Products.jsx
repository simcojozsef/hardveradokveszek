import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getMyProducts, deleteProduct } from '../../api/seller';

export default function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    async function loadProducts() {
        try {
            setLoading(true);

            const response = await getMyProducts();

            setProducts(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadProducts();
    }, []);

    if (loading) {
        return (
            <div className="seller-page">
                <p>Termékek betöltése...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="seller-page">
                <h1>Termékek</h1>
                <p className="form-error">{error}</p>
            </div>
        );
    }

    async function handleDelete(product) {
        const confirmed = window.confirm(
            `Biztosan törölni szeretnéd ezt a terméket?\n\n${product.name}`
        );

        if (!confirmed) {
            return;
        }

        try {
            await deleteProduct(product.id);

            setProducts((current) =>
                current.filter(
                    (item) => item.id !== product.id
                )
            );
        } catch (err) {
            setError(err.message);
        }
    }



    return (
        <div className="seller-page">
            <div className="seller-page__header">
                <div>
                    <p className="eyebrow">Üzlet</p>
                    <h1>Termékek</h1>
                </div>

                <Link
                    to="/seller/products/create"
                    className="seller-button"
                >
                    + Új termék
                </Link>
            </div>

            {products.length === 0 ? (
                <section className="dashboard-card">
                    <h2>Még nincs termék</h2>

                    <p>
                        Hozd létre az első termékedet.
                    </p>

                    <Link
                        to="/seller/products/create"
                        className="button"
                    >
                        Első termék létrehozása
                    </Link>
                </section>
            ) : (
                <section className="dashboard-card">
                    <div className="seller-product-table">
                        {products.map((product) => {
                            const image =
                                product.images?.find(
                                    (item) => item.is_primary
                                ) ||
                                product.images?.[0];

                            return (
                                <article
                                    key={product.id}
                                    className="seller-product-item"
                                >
                                    <div className="seller-product-item__image">
                                        {image ? (
                                            <img
                                                src={image.url}
                                                alt={product.name}
                                            />
                                        ) : (
                                            <span>
                                                Nincs kép
                                            </span>
                                        )}
                                    </div>

                                    <div className="seller-product-item__main">
                                        <h3>{product.name}</h3>

                                        <p>
                                            {product.description}
                                        </p>
                                    </div>

                                    <div className="seller-product-item__price">
                                        {Number(
                                            product.price
                                        ).toLocaleString(
                                            'hu-HU'
                                        )}{' '}
                                        Ft
                                    </div>

                                    <div className="seller-product-item__stock">
                                        {product.stock} db
                                    </div>

                                    <div className="seller-product-item__status">
                                        {product.is_active
                                            ? 'Aktív'
                                            : 'Inaktív'}
                                    </div>

                                    <div className="seller-product-item__actions">
                                        <Link
                                            to={`/seller/products/${product.id}/edit`}
                                            className="seller-button"
                                        >
                                            Szerkesztés
                                        </Link>

                                        <button
                                            type="button"
                                            className="danger-button"
                                            onClick={() => handleDelete(product)}
                                        >
                                            Törlés
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
}
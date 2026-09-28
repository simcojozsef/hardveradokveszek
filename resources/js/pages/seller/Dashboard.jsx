import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import {
    getMyProducts,
    getMyStore,
} from '../../api/seller';

export default function Dashboard() {
    const { user } = useAuth();

    const [store, setStore] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function loadDashboard() {
            try {
                const storeResponse = await getMyStore();

                setStore(storeResponse.data);

                const productsResponse = await getMyProducts();

                setProducts(productsResponse.data);
            } catch (err) {
                // A seller without a store is a normal onboarding state.
                if (err.message === 'You do not have a store yet.') {
                    setStore(null);
                    return;
                }

                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadDashboard();
    }, []);

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
            </main>
        );
    }

    if (!store) {
        return (
            <main className="page seller-dashboard">
                <section className="dashboard-card seller-onboarding">
                    <div className="seller-onboarding__content">
                        <p className="eyebrow">Eladói fiók</p>

                        <h1>
                            Kezdj el értékesíteni!
                        </h1>

                        <p>
                            Ahhoz, hogy elkezdhess értékesíteni,
                            előbb létre kell hoznod egy üzletet. Kattints az alábbi gombra, és add meg az üzleted adatait.
                        </p>

                        <Link
                            to="/seller/store/create"
                            className="seller-button"
                        >
                            Üzlet létrehozása
                        </Link>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="page seller-dashboard">
            <header className="seller-dashboard__header">
                <div>
                    <p className="eyebrow">Eladó</p>

                    <h1>
                        Üdv, {user?.name}!
                    </h1>
                </div>
            </header>

            <section className="dashboard-card seller-products-card">
                <div className="dashboard-card__header">
                    <div>
                        <p>Termékek</p>

                        <h2>
                            {products.length} termék
                        </h2>
                    </div>

                    <Link
                        to="/seller/products/create"
                        className="seller-button"
                    >
                        + Új termék
                    </Link>
                </div>

                {products.length === 0 ? (
                    <div className="seller-empty-products">
                        <h3>Még nincs terméked</h3>

                        <p>
                            Hozd létre az első termékedet az üzletedben.
                        </p>

                        <Link
                            to="/seller/products/create"
                            className="button"
                        >
                            Első termék létrehozása
                        </Link>
                    </div>
                ) : (
                    <div className="seller-dashboard-products">
                        {products.map((product) => {
                            const primaryImage =
                                product.images?.find(
                                    (image) => image.is_primary
                                ) ||
                                product.images?.[0];

                            return (
                                <article
                                    key={product.id}
                                    className="seller-dashboard-product"
                                >
                                    <Link
                                        to={`/seller/products/${product.id}/edit`}
                                        className="seller-dashboard-product__image"
                                    >
                                        {primaryImage ? (
                                            <img
                                                src={primaryImage.url}
                                                alt={product.name}
                                            />
                                        ) : (
                                            <div className="seller-dashboard-product__placeholder">
                                                Nincs kép
                                            </div>
                                        )}
                                    </Link>

                                    <div className="seller-dashboard-product__content">
                                        <div className="seller-dashboard-product__top">
                                            <div>
                                                <p className="seller-dashboard-product__store-label">
                                                    Termék
                                                </p>

                                                <h3>
                                                    {product.name}
                                                </h3>
                                            </div>

                                            <span
                                                className={
                                                    product.is_active
                                                        ? 'product-status product-status--active'
                                                        : 'product-status product-status--inactive'
                                                }
                                            >
                                                {product.is_active
                                                    ? 'Aktív'
                                                    : 'Inaktív'}
                                            </span>
                                        </div>

                                        <p className="seller-dashboard-product__description">
                                            {product.description ||
                                                'Nincs termékleírás.'}
                                        </p>

                                        <div className="seller-dashboard-product__meta">
                                            <strong>
                                                {Number(
                                                    product.price
                                                ).toLocaleString(
                                                    'hu-HU'
                                                )}{' '}
                                                Ft
                                            </strong>

                                            <span>
                                                {product.stock} db készleten
                                            </span>
                                        </div>

                                        <div className="seller-dashboard-product__actions">
                                            <Link
                                                to={`/seller/products/${product.id}/edit`}
                                                className="seller-button"
                                            >
                                                Szerkesztés
                                            </Link>

                                            <Link
                                                to={`/product/${product.id}`}
                                                className="seller-button"
                                            >
                                                Megtekintés →
                                            </Link>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </main>
    );
}
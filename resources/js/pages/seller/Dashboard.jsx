import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import SellerMessageNotice from '../../components/SellerMessageNotice';
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
        <main className="page seller-page seller-dashboard">
            <header className="seller-dashboard__header">
                <div>
                    <p className="eyebrow">Eladó</p>
                    <h1>
                        Üdv, {user?.name}!
                    </h1>
                </div>
            </header>
            <SellerMessageNotice />
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
                    /*
                     * Mirrors the Termékek page: one compact row per product,
                     * thumbnail on the left and the details beside it, with a
                     * link through to the full list.
                     */
                    <div className="seller-product-table">
                        {products.map((product) => {
                            const primaryImage =
                                product.images?.find(
                                    (image) => image.is_primary
                                ) ||
                                product.images?.[0];
                            return (
                                <article
                                    key={product.id}
                                    className="seller-product-item"
                                >
                                    <div className="seller-product-item__image">
                                        {primaryImage ? (
                                            <img
                                                src={primaryImage.url}
                                                alt={product.name}
                                            />
                                        ) : (
                                            <span>Nincs kép</span>
                                        )}
                                    </div>

                                    <div className="seller-product-item__main">
                                        <h3>{product.name}</h3>
                                        <p>
                                            {[
                                                product.brand,
                                                product.model,
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </p>
                                        <p>
                                            {[
                                                product.county,
                                                product.settlement,
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </p>
                                    </div>

                                    <div className="seller-product-item__price">
                                        {Number(
                                            product.price
                                        ).toLocaleString('hu-HU')}{' '}
                                        Ft
                                    </div>

                                    <div className="seller-product-item__stock">
                                        {product.stock} db
                                    </div>

                                    <div className="seller-product-item__status">
                                        <span>
                                            {product.is_active
                                                ? 'Aktív'
                                                : 'Inaktív'}
                                        </span>
                                    </div>

                                    <div className="seller-product-item__actions">
                                        <Link
                                            to={`/seller/products/${product.id}/edit`}
                                            className="seller-button"
                                        >
                                            Szerkesztés
                                        </Link>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}

                {products.length > 0 && (
                    <div className="seller-products-card__footer">
                        <Link to="/seller/products" className="secondary-button">
                            Összes termék kezelése →
                        </Link>
                    </div>
                )}
            </section>
        </main>
    );
}

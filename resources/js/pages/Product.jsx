import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getProduct } from '../api/products';
import ProductGallery from '../components/ProductGallery';
import { addToCart } from '../api/buyer';
import { trackEvent } from '../api/analytics';

export default function Product() {
    const { id } = useParams();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [addingToCart, setAddingToCart] = useState(false);
    const [cartMessage, setCartMessage] = useState('');

    useEffect(() => {
        let cancelled = false;

        async function loadProduct() {
            try {
                const response = await getProduct(id);

                if (!cancelled) {
                    setProduct(response.data);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadProduct();

        return () => {
            cancelled = true;
        };
    }, [id]);

    /*
    |--------------------------------------------------------------------------
    | Analytics
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (!product?.id) {
            return;
        }

        trackEvent({
            event: 'product_view',
            subjectType: 'product',
            subjectId: product.id,
            pageUrl: `/product/${product.id}`,
        });
    }, [product?.id]);

    async function handleAddToCart() {
        try {
            setAddingToCart(true);
            setCartMessage('');

            await addToCart(product.id, 1);

            setCartMessage(
                'A termék bekerült a kosárba.'
            );
        } catch (err) {
            setCartMessage(err.message);
        } finally {
            setAddingToCart(false);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Conditional rendering comes AFTER all hooks
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
            </main>
        );
    }

    if (!product) {
        return (
            <main className="page">
                <h1>A termék nem található.</h1>
            </main>
        );
    }

    return (
        <main className="page product-page">
            <div className="product-page__back">
                <Link
                    to={`/store/${product.store?.slug ?? ''}`}
                >
                    ← Üzlet
                </Link>
            </div>

            <div className="product-page__layout">
                <ProductGallery
                    images={product.images}
                    productName={product.name}
                />

                <section className="product-page__info">
                    <div className="product-page__store">
                        <span>Eladó:</span>{' '}
                        <Link
                            to={`/store/${product.store?.slug}`}
                        >
                            {product.store?.name}
                        </Link>
                    </div>

                    <h1>{product.name}</h1>

                    <p className="product-page__description">
                        {product.description}
                    </p>

                    <div className="product-page__price">
                        {Number(
                            product.price
                        ).toLocaleString('hu-HU')}{' '}
                        Ft
                    </div>

                    <div className="product-page__stock">
                        {product.stock > 0
                            ? `${product.stock} db készleten`
                            : 'Elfogyott'}
                    </div>

                    <button
                        type="button"
                        disabled={
                            product.stock <= 0 ||
                            addingToCart
                        }
                        onClick={handleAddToCart}
                    >
                        {addingToCart
                            ? 'Hozzáadás...'
                            : 'Kosárba'}
                    </button>

                    {cartMessage && (
                        <p>{cartMessage}</p>
                    )}
                </section>
            </div>
        </main>
    );
}
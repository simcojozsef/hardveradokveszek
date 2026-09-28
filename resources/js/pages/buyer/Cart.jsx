import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
    getMyCart,
    updateCartItem,
    removeCartItem,
} from '../../api/buyer';

export default function Cart() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    async function loadCart() {
        try {
            setLoading(true);
            setError('');

            const response = await getMyCart();

            setItems(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadCart();
    }, []);

    async function changeQuantity(item, quantity) {
        if (quantity < 1) {
            return;
        }

        try {
            const response = await updateCartItem(
                item.id,
                quantity,
            );

            setItems((current) =>
                current.map((currentItem) =>
                    currentItem.id === item.id
                        ? response.data
                        : currentItem,
                ),
            );
        } catch (err) {
            setError(err.message);
        }
    }

    async function removeItem(item) {
        try {
            await removeCartItem(item.id);

            setItems((current) =>
                current.filter(
                    (currentItem) =>
                        currentItem.id !== item.id,
                ),
            );
        } catch (err) {
            setError(err.message);
        }
    }

    const total = useMemo(() => {
        return items.reduce(
            (sum, item) =>
                sum +
                Number(item.product.price) *
                    item.quantity,
            0,
        );
    }, [items]);

    if (loading) {
        return (
            <main className="page">
                <p>Kosár betöltése...</p>
            </main>
        );
    }

    return (
        <main className="page cart-page">
            <div className="cart-page__header">
                <div>
                    <p className="eyebrow">
                        Vásárlás
                    </p>

                    <h1>Kosár</h1>
                </div>
            </div>

            {error && (
                <div className="form-error">
                    {error}
                </div>
            )}

            {items.length === 0 ? (
                <section className="dashboard-card cart-empty">
                    <h2>A kosarad üres</h2>

                    <p>
                        Még nem tettél terméket a kosaradba.
                    </p>

                    <Link
                        to="/"
                        className="button"
                    >
                        Termékek böngészése
                    </Link>
                </section>
            ) : (
                <div className="cart-layout">
                    <section className="cart-items">
                        {items.map((item) => (
                            <article
                                key={item.id}
                                className="cart-item"
                            >
                                <div className="cart-item__image">
                                    {item.product.image ? (
                                        <img
                                            src={item.product.image}
                                            alt={item.product.name}
                                        />
                                    ) : (
                                        <div>Nincs kép</div>
                                    )}
                                </div>

                                <div className="cart-item__content">
                                    <Link
                                        to={`/product/${item.product.id}`}
                                        className="cart-item__name"
                                    >
                                        {item.product.name}
                                    </Link>

                                    <p className="cart-item__price">
                                        {Number(
                                            item.product.price,
                                        ).toLocaleString(
                                            'hu-HU',
                                        )}{' '}
                                        Ft / db
                                    </p>

                                    <div className="cart-item__actions">
                                        <div className="quantity-control">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    changeQuantity(
                                                        item,
                                                        item.quantity - 1,
                                                    )
                                                }
                                                disabled={
                                                    item.quantity <= 1
                                                }
                                            >
                                                −
                                            </button>

                                            <span>
                                                {item.quantity}
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    changeQuantity(
                                                        item,
                                                        item.quantity + 1,
                                                    )
                                                }
                                                disabled={
                                                    item.quantity >=
                                                    item.product.stock
                                                }
                                            >
                                                +
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            className="cart-remove"
                                            onClick={() =>
                                                removeItem(item)
                                            }
                                        >
                                            Törlés
                                        </button>
                                    </div>
                                </div>

                                <strong className="cart-item__subtotal">
                                    {(
                                        Number(
                                            item.product.price,
                                        ) *
                                        item.quantity
                                    ).toLocaleString(
                                        'hu-HU',
                                    )}{' '}
                                    Ft
                                </strong>
                            </article>
                        ))}
                    </section>

                    <aside className="cart-summary">
                        <h2>Összesítés</h2>

                        <div className="cart-summary__row">
                            <span>Termékek</span>

                            <strong>
                                {total.toLocaleString(
                                    'hu-HU',
                                )}{' '}
                                Ft
                            </strong>
                        </div>

                        <div className="cart-summary__total">
                            <span>Összesen</span>

                            <strong>
                                {total.toLocaleString(
                                    'hu-HU',
                                )}{' '}
                                Ft
                            </strong>
                        </div>

                        <Link
                            to="/buyer/checkout"
                            className="button cart-summary__checkout"
                        >
                            Tovább a pénztárhoz
                        </Link>
                    </aside>
                </div>
            )}
        </main>
    );
}
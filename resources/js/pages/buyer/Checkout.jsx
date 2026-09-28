import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
    getMyCart,
    checkout,
} from '../../api/buyer';

export default function Checkout() {
    const navigate = useNavigate();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        postal_code: '',
        city: '',
        address: '',
    });

    useEffect(() => {
        async function loadCart() {
            try {
                const response = await getMyCart();

                setItems(response.data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadCart();
    }, []);

    function handleChange(event) {
        setForm((current) => ({
            ...current,
            [event.target.name]: event.target.value,
        }));
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

    async function handleSubmit(event) {
        event.preventDefault();

        setError('');

        if (items.length === 0) {
            setError('A kosár üres.');
            return;
        }

        setSubmitting(true);

        try {
            const response = await checkout(form);

            navigate('/buyer', {
                state: {
                    orderCreated: true,
                    order: response.data,
                },
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <main className="page">
                <p>Pénztár betöltése...</p>
            </main>
        );
    }

    if (items.length === 0) {
        return (
            <main className="page checkout-page">
                <section className="dashboard-card checkout-empty">
                    <h1>A kosár üres</h1>

                    <p>
                        Nincs olyan termék a kosaradban,
                        amelyet meg lehetne rendelni.
                    </p>

                    <Link
                        to="/"
                        className="button"
                    >
                        Vissza a piactérre
                    </Link>
                </section>
            </main>
        );
    }

    return (
        <main className="page checkout-page">
            <div className="checkout-page__header">
                <div>
                    <p className="eyebrow">
                        Vásárlás
                    </p>

                    <h1>Pénztár</h1>
                </div>

                <Link
                    to="/buyer/cart"
                    className="secondary-button"
                >
                    ← Vissza a kosárhoz
                </Link>
            </div>

            {error && (
                <div className="form-error">
                    {error}
                </div>
            )}

            <div className="checkout-layout">
                <form
                    className="checkout-form"
                    onSubmit={handleSubmit}
                >
                    <section className="dashboard-card">
                        <h2>Vevő adatai</h2>

                        <div className="form-grid">
                            <label className="form-field">
                                <span>Név</span>

                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    required
                                />
                            </label>

                            <label className="form-field">
                                <span>Email</span>

                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                />
                            </label>

                            <label className="form-field form-field--full">
                                <span>Telefonszám</span>

                                <input
                                    type="tel"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="+36..."
                                    required
                                />
                            </label>
                        </div>
                    </section>

                    <section className="dashboard-card">
                        <h2>Szállítási cím</h2>

                        <div className="form-grid">
                            <label className="form-field">
                                <span>Irányítószám</span>

                                <input
                                    type="text"
                                    name="postal_code"
                                    value={form.postal_code}
                                    onChange={handleChange}
                                    placeholder="1011"
                                    required
                                />
                            </label>

                            <label className="form-field">
                                <span>Város</span>

                                <input
                                    type="text"
                                    name="city"
                                    value={form.city}
                                    onChange={handleChange}
                                    placeholder="Budapest"
                                    required
                                />
                            </label>

                            <label className="form-field form-field--full">
                                <span>Cím</span>

                                <input
                                    type="text"
                                    name="address"
                                    value={form.address}
                                    onChange={handleChange}
                                    placeholder="Utca, házszám"
                                    required
                                />
                            </label>
                        </div>
                    </section>

                    <section className="dashboard-card">
                        <h2>Fizetés</h2>

                        <div className="checkout-payment-option">
                            <input
                                type="radio"
                                checked
                                readOnly
                            />

                            <div>
                                <strong>
                                    Fizetés később
                                </strong>

                                <span>
                                    Jelenleg csak a rendelést
                                    rögzítjük. Online fizetés
                                    még nincs bekötve.
                                </span>
                            </div>
                        </div>
                    </section>

                    <button
                        type="submit"
                        className="auth-submit"
                        disabled={submitting}
                    >
                        {submitting
                            ? 'Rendelés leadása...'
                            : 'Rendelés leadása'}
                    </button>
                </form>

                <aside className="checkout-summary">
                    <section className="dashboard-card">
                        <h2>Rendelés összesítő</h2>

                        <div className="checkout-summary__items">
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className="checkout-summary__item"
                                >
                                    <div>
                                        <strong>
                                            {item.product.name}
                                        </strong>

                                        <span>
                                            {item.quantity} db ×{' '}
                                            {Number(
                                                item.product.price,
                                            ).toLocaleString(
                                                'hu-HU',
                                            )}{' '}
                                            Ft
                                        </span>
                                    </div>

                                    <strong>
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
                                </div>
                            ))}
                        </div>

                        <div className="checkout-summary__total">
                            <span>Összesen</span>

                            <strong>
                                {total.toLocaleString(
                                    'hu-HU',
                                )}{' '}
                                Ft
                            </strong>
                        </div>
                    </section>
                </aside>
            </div>
        </main>
    );
}
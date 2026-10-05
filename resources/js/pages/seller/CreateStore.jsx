import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { createStore } from '../../api/seller';

export default function CreateStore() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: '',
        slug: '',
        description: '',
        contact_phone: '',
        contact_email: '',
    });

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    function handleChange(event) {
        setForm((current) => ({
            ...current,
            [event.target.name]: event.target.value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setSubmitting(true);
        setError('');

        try {
            await createStore({
                name: form.name,
                slug: form.slug,
                description: form.description,
                contact_phone: form.contact_phone.trim(),
                contact_email: form.contact_email.trim(),
            });

            navigate('/seller');
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="seller-page">
            <div className="seller-page__header">
                <div>
                    <p className="eyebrow">Eladói fiók</p>
                    <h1>Üzlet létrehozása</h1>
                </div>

                <Link to="/seller" className="secondary-button">
                    Mégse
                </Link>
            </div>

            <form className="product-form" onSubmit={handleSubmit}>
                {error && (
                    <div className="form-error" role="alert">
                        {error}
                    </div>
                )}

                <section className="dashboard-card">
                    <h2>Üzlet adatai</h2>

                    <div className="form-grid">
                        <label className="form-field form-field--full">
                            <span>Üzlet neve</span>
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="pl. Alaplapok és PC Alkatrészek"
                                required
                            />
                        </label>

                        <label className="form-field form-field--full">
                            <span>Üzlet slug</span>
                            <input
                                type="text"
                                name="slug"
                                value={form.slug}
                                onChange={handleChange}
                                placeholder="pl. alaplapok"
                                pattern="[A-Za-z0-9_-]+"
                                maxLength={63}
                                required
                            />

                            <small className="form-help">
                                Ez lesz az üzleted technikai azonosítója és később
                                az aldomain alapja.
                            </small>

                            {form.slug && (
                                <div className="store-subdomain-preview">
                                    <span>Az üzleted címe:</span>
                                    <strong>
                                        {form.slug.toLowerCase()}.hardveradokveszek.hu
                                    </strong>
                                </div>
                            )}
                        </label>

                        <label className="form-field form-field--full">
                            <span>Leírás</span>
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                rows={7}
                                placeholder="Mutasd be röviden az üzletedet..."
                            />
                        </label>
                    </div>
                </section>

                <section className="dashboard-card">
                    <h2>Kapcsolattartási adatok</h2>
                    <p className="form-help">
                        Add meg, hogyan érhetik el a vásárlók az üzletedet.
                    </p>

                    <div className="form-grid">
                        <label className="form-field">
                            <span>Telefonszám</span>
                            <input
                                type="tel"
                                name="contact_phone"
                                value={form.contact_phone}
                                onChange={handleChange}
                                placeholder="pl. +36 30 123 4567"
                                autoComplete="tel"
                                maxLength={32}
                                required
                            />
                        </label>

                        <label className="form-field">
                            <span>E-mail cím</span>
                            <input
                                type="email"
                                name="contact_email"
                                value={form.contact_email}
                                onChange={handleChange}
                                placeholder="pl. info@uzlet.hu"
                                autoComplete="email"
                                maxLength={255}
                                required
                            />
                        </label>
                    </div>
                </section>

                <section className="dashboard-card">
                    <h2>Tipp</h2>
                    <p className="form-help">
                        A slug lesz az üzleted technikai azonosítója.
                    </p>
                </section>

                <div className="product-form__actions">
                    <Link to="/seller" className="secondary-button">
                        Mégse
                    </Link>

                    <button
                        type="submit"
                        className="seller-button"
                        disabled={submitting}
                    >
                        {submitting ? 'Létrehozás...' : 'Üzlet létrehozása'}
                    </button>
                </div>
            </form>
        </div>
    );
}

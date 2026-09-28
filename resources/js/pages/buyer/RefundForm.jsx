import React, { useState } from 'react';
import { requestRefund } from '../../api/buyer';

export default function RefundForm({
    group,
    onSubmitted,
    onCancel,
}) {
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        bank_name: '',
        iban: '',
        swift_code: '',
        account_number: '',
        email: '',
        phone: '',
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
            const response = await requestRefund(
                group.id,
                form
            );

            onSubmitted(response.refund);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="refund-form">
            <div className="refund-form__header">
                <div>
                    <p className="eyebrow">
                        Visszatérítés
                    </p>

                    <h3>
                        Visszatérítési igény
                    </h3>
                </div>

                <strong>
                    {Number(
                        group.total
                    ).toLocaleString('hu-HU')}{' '}
                    Ft
                </strong>
            </div>

            {error && (
                <div className="form-error">
                    {error}
                </div>
            )}

            <form
                className="refund-form__fields"
                onSubmit={handleSubmit}
            >
                <div className="form-grid">
                    <label className="form-field">
                        <span>Keresztnév</span>

                        <input
                            type="text"
                            name="first_name"
                            value={form.first_name}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label className="form-field">
                        <span>Vezetéknév</span>

                        <input
                            type="text"
                            name="last_name"
                            value={form.last_name}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label className="form-field form-field--full">
                        <span>Bank neve</span>

                        <input
                            type="text"
                            name="bank_name"
                            value={form.bank_name}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label className="form-field form-field--full">
                        <span>IBAN</span>

                        <input
                            type="text"
                            name="iban"
                            value={form.iban}
                            onChange={handleChange}
                            autoComplete="off"
                            required
                        />
                    </label>

                    <label className="form-field">
                        <span>SWIFT kód</span>

                        <input
                            type="text"
                            name="swift_code"
                            value={form.swift_code}
                            onChange={handleChange}
                            autoComplete="off"
                            required
                        />
                    </label>

                    <label className="form-field">
                        <span>Számlaszám</span>

                        <input
                            type="text"
                            name="account_number"
                            value={form.account_number}
                            onChange={handleChange}
                            autoComplete="off"
                            required
                        />
                    </label>

                    <label className="form-field">
                        <span>E-mail cím</span>

                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label className="form-field">
                        <span>Telefonszám</span>

                        <input
                            type="tel"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            required
                        />
                    </label>
                </div>

                <div className="refund-form__actions">
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={onCancel}
                        disabled={submitting}
                    >
                        Mégse
                    </button>

                    <button
                        type="submit"
                        className="button"
                        disabled={submitting}
                    >
                        {submitting
                            ? 'Igénylés küldése...'
                            : 'Visszatérítési igény benyújtása'}
                    </button>
                </div>
            </form>
        </div>
    );
}
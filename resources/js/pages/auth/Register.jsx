import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
    const navigate = useNavigate();
    const { register } = useAuth();

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'buyer',
    });

    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] =
        useState(false);

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setError('');
        setSubmitting(true);

        try {
            const response = await register(form);
            const role = response.user?.role;

            if (role === 'seller') {
                navigate('/seller');
            } else if (role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/buyer');
            }
        } catch (err) {
            setError(
                err.message ||
                'Sikertelen regisztráció.'
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="auth-page">
            <div className="auth-page__background">
                <div className="auth-card auth-card--register">
                    <div className="auth-card__header">
                        <div className="auth-card__logo">
                            <img
                                src="/images/website-images/logo-clean-white.svg"
                                alt="GigaPiac"
                                width="52"
                                height="52"
                            />
                        </div>

                        <p className="auth-card__eyebrow">
                            GigaPiac
                        </p>

                        <h1>
                            Fiók létrehozása
                        </h1>

                        <p>
                            Csatlakozz a GigaPiac piacteréhez.
                        </p>
                    </div>

                    {error && (
                        <div className="auth-alert auth-alert--error">
                            {error}
                        </div>
                    )}

                    <form
                        className="auth-form"
                        onSubmit={handleSubmit}
                    >
                        <label className="auth-field">
                            <span>Név</span>

                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Teljes neved"
                                autoComplete="name"
                                required
                            />
                        </label>

                        <label className="auth-field">
                            <span>Email cím</span>

                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="email@example.com"
                                autoComplete="email"
                                required
                            />
                        </label>

                        <label className="auth-field">
                            <span>Jelszó</span>

                            <div className="auth-password">
                                <input
                                    type={
                                        showPassword
                                            ? 'text'
                                            : 'password'
                                    }
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    required
                                />

                                <button
                                    type="button"
                                    className="auth-password__toggle"
                                    onClick={() =>
                                        setShowPassword(
                                            (current) =>
                                                !current
                                        )
                                    }
                                    aria-label={
                                        showPassword
                                            ? 'Jelszó elrejtése'
                                            : 'Jelszó megjelenítése'
                                    }
                                    aria-pressed={showPassword}
                                    title={
                                        showPassword
                                            ? 'Jelszó elrejtése'
                                            : 'Jelszó megjelenítése'
                                    }
                                >
                                    {showPassword ? (
                                        <FiEyeOff aria-hidden="true" />
                                    ) : (
                                        <FiEye aria-hidden="true" />
                                    )}
                                </button>
                            </div>
                        </label>

                        <label className="auth-field">
                            <span>Jelszó újra</span>

                            <div className="auth-password">
                                <input
                                    type={
                                        showPasswordConfirmation
                                            ? 'text'
                                            : 'password'
                                    }
                                    name="password_confirmation"
                                    value={
                                        form.password_confirmation
                                    }
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    required
                                />

                                <button
                                    type="button"
                                    className="auth-password__toggle"
                                    onClick={() =>
                                        setShowPasswordConfirmation(
                                            (current) =>
                                                !current
                                        )
                                    }
                                    aria-label={
                                        showPasswordConfirmation
                                            ? 'Jelszó elrejtése'
                                            : 'Jelszó megjelenítése'
                                    }
                                    aria-pressed={showPasswordConfirmation}
                                    title={
                                        showPasswordConfirmation
                                            ? 'Jelszó elrejtése'
                                            : 'Jelszó megjelenítése'
                                    }
                                >
                                    {showPasswordConfirmation ? (
                                        <FiEyeOff aria-hidden="true" />
                                    ) : (
                                        <FiEye aria-hidden="true" />
                                    )}
                                </button>
                            </div>
                        </label>

                        <fieldset className="account-type">
                            <legend>
                                Milyen fiókot szeretnél?
                            </legend>

                            <label className="account-type__option">
                                <input
                                    type="radio"
                                    name="role"
                                    value="buyer"
                                    checked={
                                        form.role === 'buyer'
                                    }
                                    onChange={handleChange}
                                />

                                <span>
                                    <strong>
                                        Vásárlói fiókot regisztrálok
                                    </strong>

                                    <small>
                                        Böngéssz és vásárolj
                                        termékeket a piactéren.
                                    </small>
                                </span>
                            </label>

                            <label className="account-type__option">
                                <input
                                    type="radio"
                                    name="role"
                                    value="seller"
                                    checked={
                                        form.role === 'seller'
                                    }
                                    onChange={handleChange}
                                />

                                <span>
                                    <strong>
                                        Eladói fiókot regisztrálok
                                    </strong>

                                    <small>
                                        Saját üzletet hozhatsz létre
                                        és termékeket értékesíthetsz.
                                    </small>
                                </span>
                            </label>
                        </fieldset>

                        <button
                            type="submit"
                            className="auth-submit"
                            disabled={submitting}
                        >
                            {submitting
                                ? 'Regisztráció...'
                                : 'Fiók létrehozása'}
                        </button>
                    </form>

                    <div className="auth-divider">
                        <span>már van fiókod?</span>
                    </div>

                    <div className="auth-register">
                        <span>
                            Jelentkezz be itt:
                        </span>

                        <Link to="/login">
                            Bejelentkezés
                        </Link>
                    </div>

                    <Link
                        to="/"
                        className="auth-back"
                    >
                        ← Vissza a piactérre
                    </Link>
                </div>
            </div>
        </main>
    );
}
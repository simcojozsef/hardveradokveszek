import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const toast = useToast();

    const [form, setForm] = useState({
        email: '',
        password: '',
    });

    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    function handleChange(event) {
        setForm((current) => ({
            ...current,
            [event.target.name]: event.target.value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setError('');
        setSubmitting(true);

        try {
            const response = await login(form);

            const role = response.user?.role;

            toast.success('Sikeres bejelentkezés.');

            if (role === 'seller') {
                navigate('/seller');
            } else if (role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/buyer');
            }
        } catch (err) {
            const message =
                err.message ||
                'Sikertelen bejelentkezés.';
            setError(message);
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="auth-page">
            <div className="auth-page__background">
                <div className="auth-card auth-card--login">
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
                            Üdv újra!
                        </h1>

                        <p>
                            Jelentkezz be a fiókodba.
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
                                    autoComplete="current-password"
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

                        <div className="auth-options">
                            <label className="auth-checkbox">
                                <input
                                    type="checkbox"
                                    name="remember"
                                />

                                <span>
                                    Emlékezz rám
                                </span>
                            </label>

                            <a href="#">
                                Elfelejtetted a jelszavad?
                            </a>
                        </div>

                        <button
                            type="submit"
                            className="auth-submit"
                            disabled={submitting}
                        >
                            {submitting
                                ? 'Bejelentkezés...'
                                : 'Bejelentkezés'}
                        </button>
                    </form>

                    <div className="auth-divider">
                        <span>vagy</span>
                    </div>

                    <div className="auth-register">
                        <span>
                            Még nincs fiókod?
                        </span>

                        <Link to="/register">
                            Regisztráció
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
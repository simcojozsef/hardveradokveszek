import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import GoogleAuthButton from '../../components/GoogleAuthButton';

import '../../../css/auth-2fa.css';

function dashboardPath(role) {
    if (role === 'seller') return '/seller';
    if (role === 'admin') return '/admin';
    return '/buyer';
}

export default function Login() {
    const navigate = useNavigate();
    const { login, completeTwoFactor } = useAuth();
    const toast = useToast();
    const [searchParams] = useSearchParams();

    const [form, setForm] = useState({
        email: '',
        password: '',
    });

    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    /*
     * Second factor. Once the credentials are accepted the server emails a
     * code and we swap this form for the code entry instead of signing in.
     */
    const [stage, setStage] = useState('credentials');
    const [pendingEmail, setPendingEmail] = useState('');
    const [twoFactorToken, setTwoFactorToken] = useState('');
    const [code, setCode] = useState('');
    const codeInputRef = useRef(null);

    /*
     * The Google callback redirects back here with ?social_error=... on
     * failure, and ?requires_2fa=1 when a password account needs the code.
     */
    useEffect(() => {
        const socialError = searchParams.get('social_error');

        if (socialError) {
            setError(socialError);
            toast.error(socialError);
        }

        if (searchParams.get('requires_2fa')) {
            setStage('code');
            setPendingEmail(searchParams.get('email') || '');
            setTwoFactorToken(searchParams.get('two_factor_token') || '');
            toast.info('A folytatáshoz add meg az e-mailben kapott kódot.');
        }
    }, [searchParams]);

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

            /*
             * The server never signs us in on the first step now: it either
             * asks for the emailed code or tells us the address is unverified.
             */
            if (response.requires_2fa) {
                setPendingEmail(response.email || form.email);
                setTwoFactorToken(response.two_factor_token || '');
                setStage('code');
                setCode('');
                toast.success('Elküldtük a bejelentkezési kódot e-mailben.');
            } else if (response.user) {
                toast.success('Sikeres bejelentkezés.');
                navigate(dashboardPath(response.user.role));
            }
        } catch (err) {
            const message =
                err.message ||
                'Sikertelen bejelentkezés.';

            /*
             * An unverified registration lands here: send them to the code
             * screen so they can finish it instead of being stuck.
             */
            if (err.status === 422 && /verified/i.test(message)) {
                setPendingEmail(form.email);
                setStage('code');
                setCode('');
                toast.info('Előbb erősítsd meg az e-mail címedet.');
            } else {
                setError(message);
                toast.error(message);
            }
        } finally {
            setSubmitting(false);
        }
    }

    async function handleVerifySubmit(event) {
        event.preventDefault();

        setError('');
        setSubmitting(true);

        try {
            const response = await completeTwoFactor(code, twoFactorToken);

            toast.success('Sikeres bejelentkezés.');
            navigate(dashboardPath(response.user?.role));
        } catch (err) {
            const message =
                err.message ||
                'Érvénytelen vagy lejárt kód.';

            setError(message);
            toast.error(message);

            if (err.status === 419) {
                setStage('credentials');
            }
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
                            {stage === 'code'
                                ? 'Kétlépcsős belépés'
                                : 'Üdv újra!'}
                        </h1>

                        <p>
                            {stage === 'code'
                                ? 'Írd be az e-mailben kapott 6 jegyű kódot.'
                                : 'Jelentkezz be a fiókodba.'}
                        </p>
                    </div>

                    {error && (
                        <div className="auth-alert auth-alert--error">
                            {error}
                        </div>
                    )}

                    {stage === 'code' ? (
                        <form
                            className="auth-form"
                            onSubmit={handleVerifySubmit}
                        >
                            {pendingEmail && (
                                <p className="auth-code-hint">
                                    A kódot ide küldtük:{' '}
                                    <strong>{pendingEmail}</strong>
                                </p>
                            )}

                            <label className="auth-field">
                                <span>Bejelentkezési kód</span>

                                <input
                                    ref={codeInputRef}
                                    className="auth-code-input"
                                    type="text"
                                    name="code"
                                    value={code}
                                    onChange={(event) =>
                                        setCode(
                                            event.target.value
                                                .replace(/\D/g, '')
                                                .slice(0, 6)
                                        )
                                    }
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    placeholder="000000"
                                    maxLength={6}
                                    autoFocus
                                    required
                                />
                            </label>

                            <button
                                type="submit"
                                className="auth-submit"
                                disabled={submitting || code.length !== 6}
                            >
                                {submitting
                                    ? 'Ellenőrzés...'
                                    : 'Belépés'}
                            </button>

                            <button
                                type="button"
                                className="auth-code-back"
                                onClick={() => {
                                    setStage('credentials');
                                    setCode('');
                                    setError('');
                                }}
                            >
                                <FiArrowLeft aria-hidden="true" />
                                Vissza a bejelentkezéshez
                            </button>
                        </form>
                    ) : (
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
                    )}

                    {stage === 'credentials' && (
                        <>
                            <div className="auth-divider">
                                <span>vagy</span>
                            </div>

                            <GoogleAuthButton label="Bejelentkezés Google-fiókkal" />

                            <div className="auth-register">
                                <span>
                                    Még nincs fiókod?
                                </span>

                                <Link to="/register">
                                    Regisztráció
                                </Link>
                            </div>
                        </>
                    )}

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
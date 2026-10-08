import React, { useEffect, useState } from 'react';

import {
    getMyPlan,
    getMySubscription,
    saveBillingProfile,
    startProCheckout,
    openBillingPortal,
    getMyRetention,
    saveMyRetention,
    getMyInvoices,
    getMyProducts,
} from '../../api/seller';
import { useToast } from '../../context/ToastContext';

import '../../../css/seller-subscription.css';

function formatHuf(value) {
    return `${Number(value || 0).toLocaleString('hu-HU')} Ft`;
}

function formatDate(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

/*
 * The billing fields an invoice cannot be issued without. Kept in one place so
 * the "is it complete" check and the form always agree.
 */
const REQUIRED_BILLING_FIELDS = [
    ['name', 'Név'],
    ['email', 'Számlázási e-mail'],
    ['country', 'Ország'],
    ['postal_code', 'Irányítószám'],
    ['city', 'Település'],
    ['address', 'Cím'],
];

function missingBillingFields(billing) {
    const missing = REQUIRED_BILLING_FIELDS
        .filter(([field]) => !String(billing[field] ?? '').trim())
        .map(([, label]) => label);

    // A company invoice is only valid with a tax number.
    if (billing.type === 'company' && !String(billing.tax_number ?? '').trim()) {
        missing.push('Adószám');
    }

    return missing;
}

/*
 * Read-only view of the seller's plan.
 *
 * Every number comes from the backend (GET /api/my/plan); the page never
 * computes or sends limits, so the display can never disagree with the
 * server-side gate.
 */
export default function Subscription() {
    const toast = useToast();

    const [plan, setPlan] = useState(null);
    const [sub, setSub] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [billingOpen, setBillingOpen] = useState(false);
    const [starting, setStarting] = useState(false);
    const [savingBilling, setSavingBilling] = useState(false);

    // Billing must be saved and complete before the pay button may be used.
    const [billingSaved, setBillingSaved] = useState(false);

    // Listings to keep when PRO ends (max 10).
    const [retention, setRetention] = useState([]);
    const [products, setProducts] = useState([]);
    const [savingRetention, setSavingRetention] = useState(false);

    // The seller's own PRO invoices.
    const [invoices, setInvoices] = useState([]);

    const [billing, setBilling] = useState({
        type: 'individual',
        name: '',
        email: '',
        country: 'HU',
        postal_code: '',
        city: '',
        address: '',
        tax_number: '',
    });

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const [planRes, subRes, retentionRes, invoicesRes] = await Promise.all([
                    getMyPlan(),
                    getMySubscription(),
                    getMyRetention(),
                    getMyInvoices(),
                ]);

                if (cancelled) return;

                setPlan(planRes.data);
                setSub(subRes.data);
                setRetention(retentionRes.data?.product_ids ?? []);
                setInvoices(invoicesRes.data ?? []);

                /*
                 * The picker is only useful for a PRO seller near the end of
                 * a period, so the product list is loaded lazily below.
                 */
                if (planRes.data?.is_pro) {
                    getMyProducts(1)
                        .then((res) => {
                            if (!cancelled) setProducts(res.data ?? []);
                        })
                        .catch(() => {});
                }

                const saved = subRes.data?.billing_profile;
                if (saved) {
                    const loaded = {
                        type: saved.type || 'individual',
                        name: saved.name || '',
                        email: saved.email || '',
                        country: saved.country || 'HU',
                        postal_code: saved.postal_code || '',
                        city: saved.city || '',
                        address: saved.address || '',
                        tax_number: saved.tax_number || '',
                    };

                    setBilling(loaded);
                    // Server decides completeness; never inferred from the UI.
                    setBillingSaved(Boolean(subRes.data?.billing_complete));
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || 'A csomag adatai nem tölthetők be.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, []);

    function handleBillingChange(event) {
        const { name, value } = event.target;
        setBilling((current) => ({ ...current, [name]: value }));
    }

    async function handleSaveBilling(event) {
        event.preventDefault();

        const missing = missingBillingFields(billing);

        if (missing.length > 0) {
            toast.error(`Hiányzó adatok: ${missing.join(', ')}.`);
            return;
        }

        setSavingBilling(true);

        try {
            const response = await saveBillingProfile(billing);
            setSub((current) => ({ ...current, billing_profile: response.data }));
            setBillingSaved(true);
            setBillingOpen(false);
            toast.success('Számlázási adatok elmentve. Most már indíthatod a fizetést.');
        } catch (err) {
            toast.error(err.message || 'A mentés nem sikerült.');
        } finally {
            setSavingBilling(false);
        }
    }

    async function handleCheckout() {
        /*
         * Guard mirrors the server rule so the user gets a clear message
         * instead of a failed request.
         */
        const missing = missingBillingFields(billing);

        if (!billingSaved || missing.length > 0) {
            if (missing.length > 0) {
                toast.error(`Fizetés előtt add meg: ${missing.join(', ')}.`);
            } else {
                toast.error('Fizetés előtt mentsd el a számlázási adatokat.');
            }

            setBillingOpen(true);
            return;
        }

        setStarting(true);

        try {
            const response = await startProCheckout();
            // Full-page redirect to Stripe; the amount is server-side only.
            window.location.href = response.checkout_url;
        } catch (err) {
            toast.error(err.message || 'Az előfizetés indítása nem sikerült.');
            setStarting(false);
        }
    }

    function toggleRetention(productId) {
        setRetention((current) => {
            if (current.includes(productId)) {
                return current.filter((id) => id !== productId);
            }

            if (current.length >= 10) {
                toast.error('Legfeljebb 10 hirdetést jelölhetsz meg.');
                return current;
            }

            return [...current, productId];
        });
    }

    async function handleSaveRetention() {
        setSavingRetention(true);

        try {
            const response = await saveMyRetention(retention);
            setRetention(response.data?.product_ids ?? retention);
            toast.success('Kijelölés elmentve.');
        } catch (err) {
            toast.error(err.message || 'A kijelölés mentése nem sikerült.');
        } finally {
            setSavingRetention(false);
        }
    }

    async function handlePortal() {
        try {
            const response = await openBillingPortal();
            window.location.href = response.portal_url;
        } catch (err) {
            toast.error(err.message || 'A fizetési portál nem nyitható meg.');
        }
    }

    if (loading) {
        return (
            <div className="seller-page">
                <p className="subscription-state">Csomag betöltése...</p>
            </div>
        );
    }

    if (error || !plan) {
        return (
            <div className="seller-page">
                <div className="subscription-state subscription-state--error" role="alert">
                    {error || 'A csomag nem érhető el.'}
                </div>
            </div>
        );
    }

    const { limits, features, usage } = plan;
    const used = Number(usage?.active_listings ?? 0);
    const max = Number(limits?.max_active_listings ?? 0);
    const percent = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
    const expiresAt = formatDate(plan.pro_entitled_until);

    return (
        <div className="seller-page seller-subscription">
            <header className="seller-page__header">
                <div>
                    <p className="eyebrow">Előfizetés</p>
                    <h1>Csomag és limitek</h1>
                </div>
            </header>

            <section className={`plan-card plan-card--${plan.is_pro ? 'pro' : 'free'}`}>
                <div className="plan-card__head">
                    <div>
                        <span className="plan-card__badge">
                            {plan.is_pro ? 'PRO előfizető' : 'Ingyenes csomag'}
                        </span>
                        <h2>{plan.plan_name}</h2>
                    </div>

                    <div className="plan-card__price">
                        {plan.is_pro ? (
                            <>
                                <strong>{formatHuf(plan.pro_price_huf)}</strong>
                                <span>/ hó</span>
                            </>
                        ) : (
                            <strong>0 Ft</strong>
                        )}
                    </div>
                </div>

                {plan.is_pro && expiresAt && (
                    <p className="plan-card__meta">
                        A fizetett időszak eddig érvényes: <strong>{expiresAt}</strong>
                    </p>
                )}

                {!plan.is_pro && (
                    <p className="plan-card__meta">
                        A PRO csomag {formatHuf(plan.pro_price_huf)} / hó.
                    </p>
                )}
            </section>

            <section className="plan-usage">
                <div className="plan-usage__head">
                    <h2>Aktív hirdetések</h2>
                    <span>
                        <strong>{used}</strong> / {max}
                    </span>
                </div>

                <div
                    className="plan-usage__bar"
                    role="progressbar"
                    aria-valuenow={used}
                    aria-valuemin={0}
                    aria-valuemax={max}
                >
                    <span style={{ width: `${percent}%` }} />
                </div>

                {used >= max && (
                    <p className="plan-usage__warn">
                        Elérted a csomagban elérhető aktív hirdetések számát.
                    </p>
                )}
            </section>

            <section className="plan-limits">
                <h2>Limitek</h2>

                <dl>
                    <div>
                        <dt>Aktív hirdetés</dt>
                        <dd>{limits.max_active_listings}</dd>
                    </div>
                    <div>
                        <dt>Fotó hirdetésenként</dt>
                        <dd>{limits.max_photos_per_listing}</dd>
                    </div>
                    <div>
                        <dt>Hirdetés érvényessége</dt>
                        <dd>{limits.listing_validity_days} nap</dd>
                    </div>
                    <div>
                        <dt>Előresorolás / időszak</dt>
                        <dd>{limits.bumps_per_period || '—'}</dd>
                    </div>
                </dl>
            </section>

            <section className="plan-features">
                <h2>Szolgáltatások</h2>

                <ul>
                    <li className={features.bulk_renewal ? 'is-on' : 'is-off'}>
                        Tömeges megújítás
                    </li>
                    <li className={features.bulk_price_stock ? 'is-on' : 'is-off'}>
                        Tömeges ár- és készletmódosítás
                    </li>
                    <li className={limits.import_rows > 0 ? 'is-on' : 'is-off'}>
                        XLSX / CSV import
                        {limits.import_rows > 0 && (
                            <small> ({limits.import_rows} sor / import)</small>
                        )}
                    </li>
                    <li className={features.store_profile_extras ? 'is-on' : 'is-off'}>
                        Logó és bemutatkozás
                    </li>
                    <li className={features.advanced_stats ? 'is-on' : 'is-off'}>
                        Részletes statisztika
                    </li>
                </ul>
            </section>

            {/* PRO upgrade + billing, only when checkout is configured. */}
            {sub?.checkout_available && (
                <section className="plan-checkout">
                    <h2>PRO előfizetés</h2>

                    {sub.has_live_subscription ? (
                        <>
                            <p className="plan-checkout__status">
                                Előfizetés állapota:{' '}
                                <strong>{sub.subscription_status}</strong>
                                {sub.cancel_at_period_end && (
                                    <> — az időszak végén lemondva</>
                                )}
                            </p>

                            <button
                                type="button"
                                className="secondary-button"
                                onClick={handlePortal}
                            >
                                Fizetési adatok kezelése
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="plan-checkout__hint">
                                A PRO csomag {formatHuf(plan.pro_price_huf)} / hó. Az
                                előfizetéshez először add meg és mentsd el a
                                számlázási adatokat — ezekből készül a számla.
                            </p>

                            {!billingSaved && missingBillingFields(billing).length > 0 && (
                                <p className="plan-checkout__missing" role="status">
                                    <strong>Fizetés előtt még szükséges:</strong>{' '}
                                    {missingBillingFields(billing).join(', ')}
                                </p>
                            )}

                            {!billingOpen ? (
                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => setBillingOpen(true)}
                                >
                                    {billingSaved
                                        ? 'Számlázási adatok módosítása'
                                        : 'Számlázási adatok megadása'}
                                </button>
                            ) : (
                                <form className="billing-form" onSubmit={handleSaveBilling}>
                                    <fieldset className="billing-form__type">
                                        <legend>Számlázási típus</legend>

                                        <label>
                                            <input
                                                type="radio"
                                                name="type"
                                                value="individual"
                                                checked={billing.type === 'individual'}
                                                onChange={handleBillingChange}
                                            />
                                            <span>Magánszemély</span>
                                        </label>

                                        <label>
                                            <input
                                                type="radio"
                                                name="type"
                                                value="company"
                                                checked={billing.type === 'company'}
                                                onChange={handleBillingChange}
                                            />
                                            <span>Cég</span>
                                        </label>
                                    </fieldset>

                                    <div className="billing-form__grid">
                                        <label className="form-field billing-form__full">
                                            <span>
                                                {billing.type === 'company'
                                                    ? 'Cégnév'
                                                    : 'Név'}
                                            </span>
                                            <input
                                                type="text"
                                                name="name"
                                                value={billing.name}
                                                onChange={handleBillingChange}
                                                required
                                            />
                                        </label>

                                        <label className="form-field">
                                            <span>Számlázási e-mail</span>
                                            <input
                                                type="email"
                                                name="email"
                                                value={billing.email}
                                                onChange={handleBillingChange}
                                                required
                                            />
                                        </label>

                                        <label className="form-field">
                                            <span>Ország (ISO kód)</span>
                                            <input
                                                type="text"
                                                name="country"
                                                value={billing.country}
                                                onChange={handleBillingChange}
                                                maxLength={2}
                                                required
                                            />
                                        </label>

                                        <label className="form-field">
                                            <span>Irányítószám</span>
                                            <input
                                                type="text"
                                                name="postal_code"
                                                value={billing.postal_code}
                                                onChange={handleBillingChange}
                                                required
                                            />
                                        </label>

                                        <label className="form-field">
                                            <span>Település</span>
                                            <input
                                                type="text"
                                                name="city"
                                                value={billing.city}
                                                onChange={handleBillingChange}
                                                required
                                            />
                                        </label>

                                        <label className="form-field billing-form__full">
                                            <span>Cím</span>
                                            <input
                                                type="text"
                                                name="address"
                                                value={billing.address}
                                                onChange={handleBillingChange}
                                                required
                                            />
                                        </label>

                                        {billing.type === 'company' && (
                                            <label className="form-field billing-form__full">
                                                <span>Adószám</span>
                                                <input
                                                    type="text"
                                                    name="tax_number"
                                                    value={billing.tax_number}
                                                    onChange={handleBillingChange}
                                                    required
                                                />
                                            </label>
                                        )}
                                    </div>

                                    <div className="billing-form__actions">
                                        <button
                                            type="button"
                                            className="secondary-button"
                                            onClick={() => setBillingOpen(false)}
                                        >
                                            Mégsem
                                        </button>

                                        <button
                                            type="submit"
                                            className="post-listing-button post-listing-button--primary"
                                            disabled={savingBilling}
                                        >
                                            {savingBilling ? 'Mentés...' : 'Mentés'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            <button
                                type="button"
                                className="plan-checkout__cta"
                                onClick={handleCheckout}
                                disabled={starting || !billingSaved}
                                title={
                                    billingSaved
                                        ? undefined
                                        : 'Előbb mentsd el a számlázási adatokat'
                                }
                            >
                                {starting
                                    ? 'Átirányítás a fizetéshez...'
                                    : `Előfizetek — ${formatHuf(plan.pro_price_huf)} / hó`}
                            </button>

                            {!billingSaved && (
                                <p className="plan-checkout__locked">
                                    A fizetés gomb a számlázási adatok mentése után
                                    válik elérhetővé.
                                </p>
                            )}
                        </>
                    )}
                </section>
            )}

            {/* Which listings survive when PRO ends (max 10). */}
            {plan.is_pro && products.length > 0 && (
                <section className="plan-retention">
                    <h2>Megtartandó hirdetések</h2>

                    <p className="plan-retention__hint">
                        A PRO csomag megszőnésekor legfeljebb 10 hirdetés marad
                        aktív. Jelöld meg, melyeket szeretnéd megtartani — a
                        többit a rendszer archiválja, de nem törli.
                    </p>

                    <p className="plan-retention__count">
                        Kijelölve: <strong>{retention.length}</strong> / 10
                    </p>

                    <ul className="plan-retention__list">
                        {products.map((product) => {
                            const checked = retention.includes(product.id);

                            return (
                                <li key={product.id}>
                                    <label
                                        className={`plan-retention__item ${
                                            checked ? 'is-selected' : ''
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleRetention(product.id)}
                                        />
                                        <span className="plan-retention__name">
                                            {product.name}
                                        </span>
                                        <span className="plan-retention__price">
                                            {formatHuf(product.price)}
                                        </span>
                                    </label>
                                </li>
                            );
                        })}
                    </ul>

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={handleSaveRetention}
                        disabled={savingRetention}
                    >
                        {savingRetention ? 'Mentés...' : 'Kijelölés mentése'}
                    </button>
                </section>
            )}

            {/* The seller's own PRO invoices. Scoped to the caller server-side. */}
            {invoices.length > 0 && (
                <section className="plan-invoices">
                    <h2>Számlák</h2>

                    <p className="plan-invoices__hint">
                        A PRO előfizetésről kiállított számlák. A bizonylatot a
                        Számlázz.hu küldi a számlázási e-mail címre.
                    </p>

                    <ul className="plan-invoices__list">
                        {invoices.map((invoice) => (
                            <li key={invoice.id} className="plan-invoices__item">
                                <div className="plan-invoices__main">
                                    <strong>
                                        {invoice.invoice_number || 'Feldolgozás alatt'}
                                    </strong>
                                    <span>
                                        {formatHuf(invoice.gross_huf)}
                                        {invoice.period_start && invoice.period_end && (
                                            <> · {invoice.period_start} – {invoice.period_end}</>
                                        )}
                                    </span>
                                </div>

                                <span
                                    className={`plan-invoices__status plan-invoices__status--${invoice.status}`}
                                >
                                    {invoice.is_available ? 'Kiállítva' : 'Függőben'}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {!sub?.checkout_available && (
                <p className="seller-subscription__note">
                    A PRO előfizetés még nincs bekonfigurálva.
                </p>
            )}
        </div>
    );
}

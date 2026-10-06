import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
    getMyStore,
    updateMyStore,
    uploadStoreLogo,
    deleteStoreLogo,
} from '../../api/seller';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
export default function Store() {
    const toast = useToast();
    const confirm = useConfirm();
    const [store, setStore] = useState(null);
    const [form, setForm] = useState({
        name: '',
        description: '',
        contact_phone: '',
        contact_email: '',
        is_active: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [uploadingLogo, setUploadingLogo] = useState(false);
    useEffect(() => {
        async function loadStore() {
            try {
                const response = await getMyStore();
                const data = response.data;
                setStore(data);
                setForm({
                    name: data.name ?? '',
                    description: data.description ?? '',
                    contact_phone: data.contact_phone ?? '',
                    contact_email: data.contact_email ?? '',
                    is_active: Boolean(data.is_active),
                });
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        loadStore();
    }, []);
    function handleChange(event) {
        const { name, value, type, checked } = event.target;
        setForm((current) => ({
            ...current,
            [name]: type === 'checkbox'
                ? checked
                : value,
        }));
    }
    async function handleSubmit(event) {
        event.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            const response = await updateMyStore({
                name: form.name,
                description: form.description,
                contact_phone: form.contact_phone.trim() || null,
                contact_email: form.contact_email.trim() || null,
                is_active: form.is_active,
            });
            setStore(response.data);
            toast.success(
                'Az üzlet adatai mentve.'
            );
        } catch (err) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    }
    if (loading) {
        return (
            <div className="seller-page">
                <p>Üzlet betöltése...</p>
            </div>
        );
    }
    if (!store) {
        return (
            <div className="seller-page">
                <h1>Nincs üzlet</h1>
                <p>
                    Még nincs létrehozva üzleted.
                </p>
                <Link
                    to="/seller"
                    className="button"
                >
                    Vissza a vezérlőpultra
                </Link>
            </div>
        );
    }
    const publicStoreUrl =
        `${window.location.origin}/store/${store.slug}`;
    async function handleLogoUpload(event) {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        setUploadingLogo(true);
        setError('');
        setSuccess('');
        try {
            const response = await uploadStoreLogo(file);
            setStore(response.data);
            toast.success('Az üzlet logója frissítve.');
        } catch (err) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setUploadingLogo(false);
            event.target.value = '';
        }
    }
    async function handleLogoDelete() {
        const confirmed = await confirm({
            message: 'Biztosan törlöd az üzlet logóját?',
            confirmLabel: 'Igen',
            cancelLabel: 'Nem',
            tone: 'danger',
        });
        if (!confirmed) {
            return;
        }
        setUploadingLogo(true);
        setError('');
        setSuccess('');
        try {
            const response = await deleteStoreLogo();
            setStore(response.data);
            toast.success('Az üzlet logója törölve.');
        } catch (err) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setUploadingLogo(false);
        }
    }
    return (
        <div className="seller-page">
            <div className="seller-page__header">
                <div>
                    <p className="eyebrow">Üzlet</p>
                    <h1>Üzlet beállításai</h1>
                </div>
                <Link
                    to={`/store/${store.slug}`}
                    className="secondary-button"
                >
                    Publikus üzlet megtekintése →
                </Link>
            </div>
            <form
                className="product-form seller-store-form"
                onSubmit={handleSubmit}
            >
                {error && (
                    <div className="form-error">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="form-success">
                        {success}
                    </div>
                )}
                <section className="dashboard-card">
                    <h2>Alapadatok</h2>
                    <div className="form-grid">
                        <label className="form-field form-field--full">
                            <span>Üzlet neve</span>
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                required
                            />
                        </label>
                        <label className="form-field form-field--full">
                            <span>Leírás</span>
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                rows={7}
                            />
                        </label>
                    </div>
                </section>
                <section className="dashboard-card">
                    <h2>Kapcsolat</h2>
                    <p className="form-help">
                        Az itt megadott adatok az üzlet nyilvános elérhetőségei lesznek.
                    </p>
                    <div className="form-grid">
                        <label className="form-field">
                            <span>Telefonszám</span>
                            <input
                                type="tel"
                                name="contact_phone"
                                value={form.contact_phone}
                                onChange={handleChange}
                                autoComplete="tel"
                                maxLength={32}
                                placeholder="+36 30 123 4567"
                            />
                        </label>
                        <label className="form-field">
                            <span>Kapcsolati e-mail-cím</span>
                            <input
                                type="email"
                                name="contact_email"
                                value={form.contact_email}
                                onChange={handleChange}
                                autoComplete="email"
                                maxLength={255}
                                placeholder="kapcsolat@uzlet.hu"
                            />
                        </label>
                    </div>
                </section>
                <section className="dashboard-card">
                    <h2>Üzlet logója</h2>
                    <div className="store-logo-manager">
                        <div className="store-logo-preview">
                            {store.logo ? (
                                <img
                                    src={store.logo}
                                    alt={`${store.name} logó`}
                                />
                            ) : (
                                <span>Nincs logó</span>
                            )}
                        </div>
                        <div className="store-logo-actions">
                            <label className="seller-button">
                                {uploadingLogo
                                    ? 'Feltöltés...'
                                    : store.logo
                                        ? 'Logó cseréje'
                                        : 'Logó feltöltése'}
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    hidden
                                    disabled={uploadingLogo}
                                    onChange={handleLogoUpload}
                                />
                            </label>
                            {store.logo && (
                                <button
                                    type="button"
                                    className="danger-button"
                                    disabled={uploadingLogo}
                                    onClick={handleLogoDelete}
                                >
                                    Logó törlése
                                </button>
                            )}
                        </div>
                    </div>
                </section>
                <section className="dashboard-card">
                    <h2>Publikus üzlet</h2>
                    <div className="store-url-box">
                        <span className="store-url-box__label">
                            Jelenlegi slug
                        </span>
                        <strong>
                            {store.slug}
                        </strong>
                        <span className="store-url-box__url">
                            {publicStoreUrl}
                        </span>
                    </div>
                    <p className="form-help">
                        A slug jelenleg zárolt, mert később ez
                        fogja meghatározni az üzlet aldomainjét.
                    </p>
                </section>
                <section className="dashboard-card">
                    <h2>Állapot</h2>
                    <label className="toggle-field">
                        <input
                            type="checkbox"
                            name="is_active"
                            checked={form.is_active}
                            onChange={handleChange}
                        />
                        <span>
                            Üzlet aktív
                        </span>
                    </label>
                    <p className="form-help">
                        Inaktív üzlet esetén a publikus
                        storefront nem lesz elérhető.
                    </p>
                </section>
                <div className="product-form__actions">
                    <Link
                        to="/seller"
                        className="secondary-button"
                    >
                        Mégse
                    </Link>
                    <button
                        type="submit"
                        className="seller-button"
                        disabled={saving}
                    >
                        {saving
                            ? 'Mentés...'
                            : 'Változtatások mentése'}
                    </button>
                </div>
            </form>
        </div>
    );
}

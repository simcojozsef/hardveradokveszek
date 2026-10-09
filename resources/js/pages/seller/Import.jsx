import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import {
    importTemplateUrl,
    previewImport,
    commitImport,
} from '../../api/import';
import { useToast } from '../../context/ToastContext';
import MediaLibrary from '../../components/MediaLibrary';

import '../../../css/product-import.css';

/*
 * PRO XLSX/CSV import, in four steps.
 *
 * 1. download the template (with the id lookup lists)
 * 2. upload the images the sheet will reference
 * 3. upload the sheet and get a preview
 * 4. approve the preview
 *
 * Nothing is written until step 4, and an error-free preview is the only one
 * that may be committed.
 */
export default function Import() {
    const toast = useToast();
    const navigate = useNavigate();

    const [mode, setMode] = useState('create');
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [busy, setBusy] = useState(false);

    function resetPreview() {
        setPreview(null);
    }

    async function handlePreview(event) {
        event.preventDefault();

        if (!file) {
            toast.error('Válassz ki egy fájlt.');
            return;
        }

        setBusy(true);

        try {
            const response = await previewImport(file, mode);
            setPreview(response.data);

            if (response.data.error_count > 0) {
                toast.error(
                    `${response.data.error_count} hibás sor — az import nem indítható.`,
                );
            } else {
                toast.success(
                    `Előnézet kész: ${response.data.valid_count} érvényes sor.`,
                );
            }
        } catch (err) {
            toast.error(err.message || 'A fájl feldolgozása nem sikerült.');
        } finally {
            setBusy(false);
        }
    }

    async function handleCommit() {
        if (!preview) return;

        setBusy(true);

        try {
            const response = await commitImport(preview.id, preview.fingerprint);
            toast.success(response.message || 'Az import elkészült.');
            setPreview(null);
            setFile(null);

            // New products land as drafts, so continue in the product list.
            navigate('/seller/products');
        } catch (err) {
            toast.error(err.message || 'Az import nem sikerült.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="seller-page seller-import">
            <div className="seller-page__header">
                <div>
                    <p className="eyebrow">PRO</p>
                    <h1>XLSX / CSV import</h1>
                </div>
                <Link to="/seller/products" className="secondary-button">
                    ← Termékek
                </Link>
            </div>

            <section className="dashboard-card import-card">
                <h2>1. Sablon letöltése</h2>
                <p className="import-card__hint">
                    A sablon tartalmazza a szükséges oszlopokat, egy példasort és
                    a kategóriaazonosítók listáját. Legfeljebb 50 adatsor
                    importálható egyszerre, maximum 5 MB.
                </p>

                <div className="import-card__actions">
                    <a className="secondary-button" href={importTemplateUrl('xlsx')}>
                        XLSX sablon
                    </a>
                    <a className="secondary-button" href={importTemplateUrl('csv')}>
                        CSV sablon
                    </a>
                </div>

                <div className="import-card__links">
                    <span className="import-card__links-label">
                        Azonosítók keresése:
                    </span>

                    <a
                        className="reference-link"
                        href="/seller/import/categories"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Kategória azonosítók ↗
                    </a>

                    <a
                        className="reference-link"
                        href="/seller/import/counties"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Megye azonosítók ↗
                    </a>

                    <a
                        className="reference-link"
                        href="/seller/import/settlements"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Település azonosítók ↗
                    </a>
                </div>
            </section>

            <MediaLibrary />

            <section className="dashboard-card import-card">
                <h2>3. Fájl feltöltése</h2>

                <fieldset className="import-mode">
                    <legend>Import mód</legend>

                    <label>
                        <input
                            type="radio"
                            name="mode"
                            value="create"
                            checked={mode === 'create'}
                            onChange={(e) => {
                                setMode(e.target.value);
                                resetPreview();
                            }}
                        />
                        <span>
                            <strong>Új termékek</strong>
                            <small>A termékek piszkozatként jönnek létre.</small>
                        </span>
                    </label>

                    <label>
                        <input
                            type="radio"
                            name="mode"
                            value="price_stock"
                            checked={mode === 'price_stock'}
                            onChange={(e) => {
                                setMode(e.target.value);
                                resetPreview();
                            }}
                        />
                        <span>
                            <strong>Ár / készlet frissítés</strong>
                            <small>Meglévő termékek módosítása seller_sku szerint.</small>
                        </span>
                    </label>
                </fieldset>

                <form className="import-form" onSubmit={handlePreview}>
                    <label className="form-field">
                        <span>Fájl (.xlsx vagy .csv)</span>
                        <input
                            type="file"
                            accept=".xlsx,.csv"
                            onChange={(e) => {
                                setFile(e.target.files?.[0] ?? null);
                                resetPreview();
                            }}
                        />
                    </label>

                    <button
                        type="submit"
                        className="seller-button"
                        disabled={busy || !file}
                    >
                        {busy ? 'Feldolgozás...' : 'Előnézet készítése'}
                    </button>
                </form>

                {mode === 'create' && (
                    <p className="import-card__hint">
                        Az importált termékek <strong>azonnal élesbe kerülnek</strong>{' '}
                        és megjelennek a weboldalon. Ha később le szeretnéd őket
                        venni, az adminisztrátor a „Tömeges feltöltések” oldalon
                        egy mozdulattal inaktiválhatja.
                    </p>
                )}
            </section>

            {preview && (
                <section className="dashboard-card import-card">
                    <h2>4. Előnézet és jóváhagyás</h2>

                    <div className="import-summary">
                        <span>
                            Összes sor: <strong>{preview.row_count}</strong>
                        </span>
                        <span>
                            Érvényes: <strong>{preview.valid_count}</strong>
                        </span>
                        <span
                            className={
                                preview.error_count > 0
                                    ? 'import-summary__bad'
                                    : 'import-summary__ok'
                            }
                        >
                            Hibás: <strong>{preview.error_count}</strong>
                        </span>
                    </div>

                    {preview.warnings?.length > 0 && (
                        <ul className="import-warnings">
                            {preview.warnings.map((warning) => (
                                <li key={warning}>{warning}</li>
                            ))}
                        </ul>
                    )}

                    {preview.error_count > 0 && (
                        <div className="import-errors">
                            <strong>Hibás sorok</strong>
                            <ul>
                                {preview.errors.map((error) => (
                                    <li key={`${error.line}-${error.sku}`}>
                                        <span>{error.line}. sor</span>
                                        {error.sku && <code>{error.sku}</code>}
                                        <span>{error.messages.join(' ')}</span>
                                    </li>
                                ))}
                            </ul>
                            <p>
                                Javítsd a hibákat a fájlban, majd töltsd fel újra.
                                Hibás sor esetén <strong>semmi</strong> nem
                                importálódik.
                            </p>
                        </div>
                    )}

                    {preview.error_count === 0 && (
                        <>
                            <div className="import-table-wrap">
                                <table className="import-table">
                                    <thead>
                                        <tr>
                                            <th>seller_sku</th>
                                            <th>név</th>
                                            <th>kategória</th>
                                            <th>ár</th>
                                            <th>készlet</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.rows.map((row) => (
                                            <tr key={row.seller_sku}>
                                                <td>{row.seller_sku}</td>
                                                <td>{row.name}</td>
                                                <td>{row.category_id}</td>
                                                <td>{row.price_huf}</td>
                                                <td>{row.stock}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <button
                                type="button"
                                className="plan-checkout__cta"
                                onClick={handleCommit}
                                disabled={busy}
                            >
                                {busy
                                    ? 'Importálás...'
                                    : mode === 'create'
                                        ? 'Importálás piszkozatként'
                                        : 'Ár / készlet alkalmazása'}
                            </button>
                        </>
                    )}
                </section>
            )}
        </div>
    );
}

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
    getMyProducts,
    deleteProduct,
    bulkRenewProducts,
    bulkUpdatePriceStock,
    getMyPlan,
    bumpProduct,
} from '../../api/seller';
import SellerProductStatus from '../../components/SellerProductStatus';
import { formatApiError } from '../../utils/productFilters';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

import '../../../css/bulk-listings.css';

export default function Products() {
    const toast = useToast();
    const confirm = useConfirm();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // Pre-reservation allowance for the current PRO period.
    const [bumpsRemaining, setBumpsRemaining] = useState(null);
    const [bumpingId, setBumpingId] = useState(null);

    // Bulk operations are PRO-only; the server re-checks, this only hides UI.
    const [isPro, setIsPro] = useState(false);
    const [selected, setSelected] = useState([]);
    const [bulkBusy, setBulkBusy] = useState(false);
    // Per-product edited price/stock for the bulk form, keyed by id.
    const [edits, setEdits] = useState({});

    const canBulk = isPro && selected.length > 0 && selected.length <= 100;

    useEffect(() => {
        let cancelled = false;

        getMyPlan()
            .then((res) => {
                if (cancelled) return;

                setIsPro(Boolean(res.data?.is_pro));
                setBumpsRemaining(res.data?.limits?.bumps_per_period ?? 0);
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, []);

    function toggleSelected(productId) {
        setSelected((current) => {
            if (current.includes(productId)) {
                return current.filter((id) => id !== productId);
            }

            if (current.length >= 100) {
                toast.error('Egyszerre legfeljebb 100 termék kezelhető.');
                return current;
            }

            return [...current, productId];
        });
    }

    function handleEditChange(productId, field, value) {
        setEdits((current) => ({
            ...current,
            [productId]: { ...(current[productId] ?? {}), [field]: value },
        }));
    }

    async function handleBulkRenew() {
        const confirmed = await confirm({
            message: 'Megerősítem, hogy az összes kijelölt termék még elérhető.',
            detail: `${selected.length} termék megújítása.`,
            confirmLabel: 'Megújítás',
            cancelLabel: 'Mégsem',
        });

        if (!confirmed) return;

        setBulkBusy(true);

        try {
            const response = await bulkRenewProducts(selected);
            toast.success(response.message || 'Hirdetések megújítva.');
            setSelected([]);
            // Reload so the new expiry is reflected from the server.
            const refreshed = await getMyProducts(page);
            setProducts(refreshed.data ?? []);
        } catch (err) {
            const message = formatApiError(err);
            setError(message);
            toast.error(message);
        } finally {
            setBulkBusy(false);
        }
    }

    async function handleBump(product) {
        setBumpingId(product.id);

        try {
            const response = await bumpProduct(product.id);
            toast.success('A hirdetés előre sorolva.');
            setBumpsRemaining(response.data?.remaining ?? null);

            // The bump changes the listing order, so reload the page of results.
            const refreshed = await getMyProducts(page);
            setProducts(refreshed.data ?? []);
        } catch (err) {
            const message = formatApiError(err);
            toast.error(message);
        } finally {
            setBumpingId(null);
        }
    }

    async function handleBulkPriceStock() {
        // Only rows the seller actually typed into are submitted, so an
        // untouched product is never rewritten with a blank value.
        const rows = selected
            .map((id) => {
                const edit = edits[id] ?? {};
                const row = { id };

                if (edit.price !== undefined && edit.price !== '') {
                    row.price = Number(edit.price);
                }

                if (edit.stock !== undefined && edit.stock !== '') {
                    row.stock = Number(edit.stock);
                }

                return row;
            })
            .filter((row) => row.price !== undefined || row.stock !== undefined);

        if (rows.length === 0) {
            toast.error('Adj meg legalább egy új árat vagy készletet.');
            return;
        }

        const confirmed = await confirm({
            message: 'Alkalmazod a tömeges módosítást?',
            detail: `${rows.length} termék módosítása.`,
            confirmLabel: 'Alkalmazás',
            cancelLabel: 'Mégsem',
        });

        if (!confirmed) return;

        setBulkBusy(true);

        try {
            const response = await bulkUpdatePriceStock(rows);
            toast.success(response.message || 'Termékek módosítva.');
            setSelected([]);
            setEdits({});
            const refreshed = await getMyProducts(page);
            setProducts(refreshed.data ?? []);
        } catch (err) {
            const message = formatApiError(err);
            setError(message);
            toast.error(message);
        } finally {
            setBulkBusy(false);
        }
    }
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError('');
        async function loadProducts() {
            try {
                const response = await getMyProducts(page);
                if (!cancelled) { setProducts(response.data ?? []); setPagination(response.meta ?? null); }
            } catch (err) {
                if (!cancelled) {
                    const message = formatApiError(err);
                    setError(message);
                    toast.error(message);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        loadProducts();
        return () => { cancelled = true; };
    }, [page]);
    async function handleDelete(product) {
        if (deletingId !== null) return;

        const confirmed = await confirm({
            message: 'Biztosan törlöd ezt a terméket?',
            detail: product.name,
            confirmLabel: 'Igen',
            cancelLabel: 'Nem',
            tone: 'danger',
        });
        if (!confirmed) return;

        try {
            setDeletingId(product.id);
            setError('');
            await deleteProduct(product.id);
            toast.success('A termék törölve.');
            if (products.length === 1 && page > 1) setPage((current) => current - 1);
            else {
                setProducts((current) => current.filter((item) => item.id !== product.id));
                setPagination((current) => current ? ({ ...current, total: Math.max(0, current.total - 1),
                    last_page: Math.max(1, Math.ceil((current.total - 1) / current.per_page)) }) : null);
            }
        } catch (err) {
            const message = formatApiError(err);
            setError(message);
            toast.error(message);
        }
        finally { setDeletingId(null); }
    }
    if (loading) return <div className="seller-page"><p>Termékek betöltése...</p></div>;
    return (
        <div className="seller-page">
            <div className="seller-page__header">
                <div><p className="eyebrow">Üzlet</p><h1>Termékek</h1></div>
                <Link to="/seller/products/create" className="seller-button">+ Új termék</Link>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}

            {/* Bulk toolbar. Hidden entirely for a free plan. */}
            {isPro && products.length > 0 && (
                <section className="bulk-toolbar">
                    <div className="bulk-toolbar__head">
                        <strong>{selected.length}</strong> termék kijelölve
                        <span className="bulk-toolbar__hint">
                            (legfeljebb 100 egyszerre)
                        </span>
                        {bumpsRemaining !== null && (
                            <span className="bulk-toolbar__bumps">
                                Előresorolás: <strong>{bumpsRemaining}</strong> maradt
                            </span>
                        )}
                    </div>

                    <div className="bulk-toolbar__actions">
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                                setSelected(
                                    selected.length === products.length
                                        ? []
                                        : products.map((p) => p.id),
                                )
                            }
                            disabled={bulkBusy}
                        >
                            {selected.length === products.length
                                ? 'Kijelölés törlése'
                                : 'Összes kijelölése'}
                        </button>

                        <button
                            type="button"
                            className="seller-button"
                            onClick={handleBulkRenew}
                            disabled={!canBulk || bulkBusy}
                        >
                            {bulkBusy ? 'Feldolgozás...' : 'Tömeges megújítás'}
                        </button>

                        <button
                            type="button"
                            className="seller-button"
                            onClick={handleBulkPriceStock}
                            disabled={!canBulk || bulkBusy}
                        >
                            Ár / készlet mentése
                        </button>
                    </div>

                    <p className="bulk-toolbar__note">
                        A megújítás nem előresorolás, és nem hosszabbítja a már
                        aktív hirdetések érvényességét a csomag limitjén túl.
                    </p>
                </section>
            )}
            {products.length === 0 && !error ? (
                <section className="dashboard-card"><h2>Még nincs termék</h2>
                    <p>Hozd létre az első termékedet.</p>
                    <Link to="/seller/products/create" className="button">Első termék létrehozása</Link>
                </section>
            ) : (
                <section className="dashboard-card"><div className="seller-product-table">
                    {products.map((product) => {
                        const image = product.images?.find((item) => item.is_primary) || product.images?.[0];
                        const labels = [
                            product.condition === 'new' ? 'Új' : product.condition === 'used' ? 'Használt' : null,
                            product.listing_type === 'wanted' ? 'Keres' : 'Kínál',
                            product.shipping_available ? 'Csomagküldés' : null,
                            product.personal_pickup ? 'Személyes átvétel' : null,
                            product.contains_ai ? 'MI tartalom' : null,
                            product.store?.is_trusted_seller ? 'Megbízható eladó' : null,
                        ].filter(Boolean);
                        return (
                            <article key={product.id} className="seller-product-item">
                                {isPro && (
                                    <label className="seller-product-item__select">
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(product.id)}
                                            onChange={() => toggleSelected(product.id)}
                                            aria-label={`${product.name} kijelölése`}
                                        />
                                    </label>
                                )}
                                <div className="seller-product-item__image">
                                    {image ? <img src={image.url} alt={product.name} /> : <span>Nincs kép</span>}
                                </div>
                                <div className="seller-product-item__main">
                                    <h3>{product.name}</h3><p>{product.description}</p>
                                    <p>{[product.brand, product.model].filter(Boolean).join(' · ')}</p>
                                    <p>{[product.county, product.settlement].filter(Boolean).join(' · ')}</p>
                                    <p>{labels.join(' · ')}</p>
                                    {product.has_warranty && product.warranty_expires_at && (
                                        <p>Garancia lejárata: {product.warranty_expires_at}</p>
                                    )}
                                </div>
                                {isPro && selected.includes(product.id) ? (
                                    <>
                                        <label className="seller-product-item__edit">
                                            <span>Ár (Ft)</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                placeholder={String(product.price)}
                                                value={edits[product.id]?.price ?? ''}
                                                onChange={(e) =>
                                                    handleEditChange(product.id, 'price', e.target.value)
                                                }
                                            />
                                        </label>

                                        <label className="seller-product-item__edit">
                                            <span>Készlet</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                placeholder={String(product.stock)}
                                                value={edits[product.id]?.stock ?? ''}
                                                onChange={(e) =>
                                                    handleEditChange(product.id, 'stock', e.target.value)
                                                }
                                            />
                                        </label>
                                    </>
                                ) : (
                                    <>
                                        <div className="seller-product-item__price">{Number(product.price).toLocaleString('hu-HU')} Ft</div>
                                        <div className="seller-product-item__stock">{product.stock} db</div>
                                    </>
                                )}
                                <div className="seller-product-item__status">
                                   <span>{product.is_active ? 'Aktív' : 'Inaktív'}</span>
                                   <SellerProductStatus key={product.id} product={product} disabled={deletingId !== null}
                                       onChange={(updated) => setProducts((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item))} />
                               </div>
                                <div className="seller-product-item__actions">
                                    {isPro && product.is_active && product.stock > 0 && (
                                        <button
                                            type="button"
                                            className="secondary-button"
                                            onClick={() => handleBump(product)}
                                            disabled={
                                                bumpingId !== null ||
                                                (bumpsRemaining !== null && bumpsRemaining <= 0)
                                            }
                                            title={
                                                bumpsRemaining !== null && bumpsRemaining <= 0
                                                    ? 'Elhasználtad az időszakra járó előresorolásokat'
                                                    : 'Előresorolás a listák elejére'
                                            }
                                        >
                                            {bumpingId === product.id ? '...' : '↑ Előre'}
                                        </button>
                                    )}
                                    <Link to={`/seller/products/${product.id}/edit`} className="seller-button">Szerkesztés</Link>
                                    <button type="button" className="danger-button" disabled={deletingId !== null} onClick={() => handleDelete(product)}>
                                        {deletingId === product.id ? 'Törlés...' : 'Törlés'}
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div></section>
            )}
            {pagination && Number(pagination.last_page) > 1 && (
                <nav className="home-pagination" aria-label="Termékoldalak">
                    <button type="button" disabled={page <= 1 || deletingId !== null} onClick={() => setPage((current) => current - 1)}>← Előző</button>
                    <span>{page} / {pagination.last_page}</span>
                    <button type="button" disabled={page >= Number(pagination.last_page) || deletingId !== null} onClick={() => setPage((current) => current + 1)}>Következő →</button>
                </nav>
            )}
        </div>
    );
}

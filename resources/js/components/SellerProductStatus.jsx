import React, { useState } from 'react';
import { updateProductListingStatus } from '../api/productLifecycle';
import { formatApiError } from '../utils/productFilters';
import { LISTING_LABELS, formatListingDate, listingStatus } from '../utils/productLifecycle';
import '../../css/product-lifecycle.css';

export default function SellerProductStatus({ product, onChange, disabled = false }) {
    const [pending, setPending] = useState('');
    const [error, setError] = useState('');
    const status = listingStatus(product);
    const editable = ['available', 'in_progress'].includes(status);
    const dates = [
        ['Feladva', product.posted_at ?? product.created_at], ['Lejárat', product.expires_at],
        ['Eladva', product.sold_at], ['Lejárt', product.expired_at], ['Eltávolítva', product.removed_at],
    ].filter(([, date]) => formatListingDate(date));
    async function change(next) {
        if (pending || disabled) return;
        if (next === 'sold' && !window.confirm(`Megjelölöd eladottként ezt a terméket?

${product.name}`)) return;
        setPending(next); setError('');
        try {
            const response = await updateProductListingStatus(product.id, next);
            onChange(response.data);
        } catch (err) { setError(formatApiError(err)); }
        finally { setPending(''); }
    }
    return (
        <div className="seller-listing-status" aria-busy={Boolean(pending)}>
            <strong>{LISTING_LABELS[status] ?? status}</strong>
            <dl className="seller-listing-status__dates">
                {dates.map(([label, date]) => <div key={label}><dt>{label}</dt><dd><time dateTime={date}>{formatListingDate(date)}</time></dd></div>)}
            </dl>
            {editable && <div className="seller-listing-status__actions">
                <button type="button" className="seller-button" disabled={disabled || Boolean(pending)}
                    onClick={() => change(status === 'in_progress' ? 'available' : 'in_progress')}>
                    {pending && pending !== 'sold' ? 'Mentés...' : status === 'in_progress' ? 'Visszaállítás elérhetőre' : 'Értékesítés alatt'}
                </button>
                <button type="button" className="seller-button" disabled={disabled || Boolean(pending)} onClick={() => change('sold')}>
                    {pending === 'sold' ? 'Mentés...' : 'Megjelölés eladottként'}
                </button>
            </div>}
            {error && <p className="form-error" role="alert">{error}</p>}
        </div>
    );
}

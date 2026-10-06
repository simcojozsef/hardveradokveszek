import React from 'react';

/**
 * Compact attribute row for a listing card.
 *
 * Shows values only (no labels) for megye, település, állapot, márka, modell,
 * csomagküldés módja and hirdetés típusa. Anything missing is skipped, so a
 * sparse listing does not render a row of empty separators.
 */

const CONDITION_LABELS = { new: 'Új', used: 'Használt' };
const LISTING_LABELS = { offer: 'Kínál', wanted: 'Keres' };
const SHIPPING_LABELS = {
    foxpost: 'Foxpost',
    gls: 'GLS',
    magyar_posta: 'Magyar Posta',
    other: 'Egyéb',
};

function text(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

export default function ProductCardMeta({ product }) {
    if (!product) return null;

    const shippingMethods = Array.isArray(product.shipping_methods)
        ? [...new Set(product.shipping_methods)]
            .filter((method) => typeof method === 'string' && method !== '')
            .map((method) => SHIPPING_LABELS[method] ?? method)
        : [];

    const listingType = text(product.listing_type);

    const values = [
        text(product.county),
        text(product.settlement),
        CONDITION_LABELS[text(product.condition)] ?? '',
        text(product.brand),
        text(product.model),
        shippingMethods.join(', '),
        LISTING_LABELS[listingType] ?? listingType,
    ].filter(Boolean);

    if (values.length === 0) return null;

    return (
        <ul className="product-card-meta" aria-label="Hirdetés adatai">
            {values.map((value, index) => (
                <li key={`${value}-${index}`} className="product-card-meta__item">
                    {value}
                </li>
            ))}
        </ul>
    );
}

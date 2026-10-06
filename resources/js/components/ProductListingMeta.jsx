import React from 'react';
import { formatListingDate, listingStatus } from '../utils/productLifecycle';
import '../../css/product-lifecycle.css';

export default function ProductListingMeta({ product }) {
    const posted = product.posted_at ?? product.created_at;
    const date = formatListingDate(posted);
    return (
        <div className="product-listing-meta">
            {date && <span>Feladva: <time dateTime={posted}>{date}</time></span>}
            {listingStatus(product) === 'in_progress' && (
                <span className="product-listing-badge product-listing-badge--reserved">Foglalt</span>
            )}
        </div>
    );
}

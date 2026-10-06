export const LISTING_LABELS = {
    available: 'Elérhető', in_progress: 'Foglalt',
    sold: 'Eladott', expired: 'Lejárt termék', removed: 'Eltávolított',
};

export function formatListingDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('hu-HU', {
        timeZone: 'Europe/Budapest', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
    }).format(date);
}

export function listingStatus(product, now = Date.now()) {
    const status = product?.listing_status ?? 'available';
    if (['available', 'in_progress'].includes(status) && product?.expires_at) {
        const expires = Date.parse(product.expires_at);
        if (Number.isFinite(expires) && expires <= now) return 'expired';
    }
    return status;
}
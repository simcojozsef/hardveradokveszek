export const EMPTY_PRODUCT_FILTERS = {
    county_id: null, settlement_id: null,
    condition: '', listing_type: 'offer', county: '', settlement: '', brand: '', model: '',
    shipping_available: false, shipping_methods: [], contains_ai: false,
    has_warranty: false, warranty_expires_at: '', personal_pickup: false, is_active: true,
};
const asBoolean = (value) => value === true || value === 1 || value === '1';
export function productFiltersFromApi(product) {
    return {
        ...EMPTY_PRODUCT_FILTERS,
        county_id: product.county_id ?? null, settlement_id: product.settlement_id ?? null,
        ...Object.fromEntries(['condition', 'listing_type', 'county', 'settlement', 'brand', 'model']
            .map((key) => [key, product[key] ?? EMPTY_PRODUCT_FILTERS[key]])),
        ...Object.fromEntries(['shipping_available', 'contains_ai', 'has_warranty', 'personal_pickup', 'is_active']
            .map((key) => [key, asBoolean(product[key])])),
        shipping_methods: Array.isArray(product.shipping_methods) ? product.shipping_methods : [],
        warranty_expires_at: product.warranty_expires_at?.slice(0, 10) ?? '',
    };
}
export function productFilterPayload(form) {
    const optional = (value) => value?.trim() || null;
    return {
        county_id: form.county_id || null, settlement_id: form.settlement_id || null,
        condition: optional(form.condition), listing_type: form.listing_type,
        county: optional(form.county), settlement: optional(form.settlement),
        brand: optional(form.brand), model: optional(form.model),
        shipping_available: form.shipping_available,
        shipping_methods: form.shipping_available ? [...form.shipping_methods] : [],
        contains_ai: form.contains_ai, personal_pickup: form.personal_pickup,
        has_warranty: form.has_warranty,
        warranty_expires_at: form.has_warranty ? (form.warranty_expires_at || null) : null,
        is_active: form.is_active,
    };
}
export function formatApiError(error) {
    const errors = error?.errors ?? error?.response?.data?.errors;
    return errors ? Object.values(errors).flat().join('\n')
        : error?.message || 'A mentés sikertelen.';
}
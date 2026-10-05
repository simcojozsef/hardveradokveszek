export const EMPTY_SEARCH_FILTERS = {
    county_id: '', settlement_id: '',
    minPrice: '', maxPrice: '', county: '', settlement: '', store: '', excludedWords: '', brand: '', model: '',
    new: false, used: false, shipping: false, excludeAi: false, warranty: false,
    personalPickup: false, trustedSeller: false, keres: false, kinal: false,
};
const TEXT_FIELDS = ['county_id', 'settlement_id', 'minPrice', 'maxPrice', 'county', 'settlement', 'store', 'excludedWords', 'brand', 'model'];
const BOOLEAN_FIELDS = ['new', 'used', 'shipping', 'excludeAi', 'warranty', 'personalPickup', 'trustedSeller', 'keres', 'kinal'];
export function normalizeSearchState(state = {}) {
    const result = { ...EMPTY_SEARCH_FILTERS, query: String(state.query ?? state.search ?? '').trim() };
    for (const field of TEXT_FIELDS) result[field] = String(state[field] ?? '').trim();
    for (const field of BOOLEAN_FIELDS) result[field] = state[field] === true || state[field] === '1' || state[field] === 1;
    return result;
}
export function buildMarketplaceParams(state = {}, page = 1) {
    const normalized = normalizeSearchState(state);
    const params = new URLSearchParams();
    if (normalized.query) params.set('search', normalized.query);
    for (const field of TEXT_FIELDS) if (normalized[field] !== '') params.set(field, normalized[field]);
    // Laravel boolean validation accepts 1/0 query strings.
    for (const field of BOOLEAN_FIELDS) if (normalized[field]) params.set(field, '1');
    if (page > 1) params.set('page', String(page));
    return params;
}
export function parseMarketplaceParams(params) {
    const result = { ...EMPTY_SEARCH_FILTERS, query: params.get('search') ?? '' };
    for (const field of TEXT_FIELDS) result[field] = params.get(field) ?? '';
    for (const field of BOOLEAN_FIELDS) result[field] = params.get(field) === '1';
    return normalizeSearchState(result);
}
export function hasSearchFilters(state) {
    return buildMarketplaceParams(state).toString() !== '';
}
function childrenOf(category) {
    if (Array.isArray(category.children_recursive) && category.children_recursive.length) return category.children_recursive;
    return Array.isArray(category.children) ? category.children : [];
}
// Reuse the complete tree already used by CategorySelect; no assumptions about SQL parent column names.
export function getCategoryScopeIds(categories, categoryId) {
    const id = Number(categoryId);
    const pending = Array.isArray(categories) ? [...categories] : [];
    const seen = new Set();
    let selected = null;
    while (pending.length) {
        const node = pending.pop();
        if (!node || seen.has(Number(node.id))) continue;
        seen.add(Number(node.id));
        if (Number(node.id) === id) { selected = node; break; }
        pending.push(...childrenOf(node));
    }
    if (!selected) throw new Error('A kategória nem található a kategóriafában.');
    const ids = new Set();
    const descendants = [selected];
    while (descendants.length) {
        const node = descendants.pop();
        const nodeId = Number(node.id);
        if (!Number.isSafeInteger(nodeId) || nodeId < 1 || ids.has(nodeId)) continue;
        ids.add(nodeId);
        descendants.push(...childrenOf(node));
    }
    return [...ids].sort((a, b) => a - b);
}
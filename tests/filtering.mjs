import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
async function loadModule(path) {
    const source = await readFile(new URL(path, import.meta.url), 'utf8');
    return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { EMPTY_SEARCH_FILTERS, buildMarketplaceParams, parseMarketplaceParams, getCategoryScopeIds } = await loadModule('../resources/js/utils/marketplaceFilters.js');
const { productFiltersFromApi, productFilterPayload } = await loadModule('../resources/js/utils/productFilters.js');
const state = { ...EMPTY_SEARCH_FILTERS, query: ' RTX ', minPrice: '0', maxPrice: '50000', brand: ' ASUS ',
    new: true, used: true, shipping: true, excludeAi: true, trustedSeller: true, keres: true, kinal: true };
const params = buildMarketplaceParams(state, 3);
assert.equal(params.get('search'), 'RTX');
assert.equal(params.get('minPrice'), '0');
assert.equal(params.get('page'), '3');
assert.equal(params.get('brand'), 'ASUS');
for (const key of ['new', 'used', 'shipping', 'excludeAi', 'trustedSeller', 'keres', 'kinal']) assert.equal(params.get(key), '1');
assert.equal(params.has('personalPickup'), false);
const restored = parseMarketplaceParams(params);
assert.equal(restored.query, 'RTX');
assert.equal(restored.minPrice, '0');
assert.equal(restored.brand, 'ASUS');
assert.equal(restored.shipping, true);
assert.equal(restored.keres, true);
assert.equal(restored.kinal, true);
assert.equal(buildMarketplaceParams({}).toString(), '');
const tree = [ { id: 1, children_recursive: [ { id: 2, children_recursive: [{ id: 3 }] }, { id: 4 } ] }, { id: 5 } ];
assert.deepEqual(getCategoryScopeIds(tree, '1'), [1, 2, 3, 4]);
assert.deepEqual(getCategoryScopeIds(tree, 2), [2, 3]);
assert.deepEqual(getCategoryScopeIds(tree, 3), [3]);
assert.throws(() => getCategoryScopeIds(tree, 999));
const form = productFiltersFromApi({ condition: 'used', listing_type: 'wanted', shipping_available: true,
    shipping_methods: ['gls'], contains_ai: true, has_warranty: true, warranty_expires_at: '2027-05-01',
    personal_pickup: false, is_active: false });
assert.equal(form.is_active, false);
assert.equal(form.warranty_expires_at, '2027-05-01');
assert.deepEqual(productFilterPayload(form).shipping_methods, ['gls']);
const cleared = productFilterPayload({ ...form, shipping_available: false, has_warranty: false, contains_ai: false });
assert.deepEqual(cleared.shipping_methods, []);
assert.equal(cleared.warranty_expires_at, null);
assert.equal(cleared.is_active, false);
assert.equal(cleared.contains_ai, false);
assert.equal(productFiltersFromApi({ is_active: '0' }).is_active, false);
assert.equal(productFilterPayload({ ...form, county: '   ' }).county, null);
// Exercise the real API helper with a stub HTTP transport.
let apiSource = await readFile(new URL('../resources/js/api/filteredProducts.js', import.meta.url), 'utf8');
apiSource = apiSource.replace("import { buildMarketplaceParams } from '../utils/marketplaceFilters';", 'const buildMarketplaceParams = globalThis.__buildParams;');
globalThis.__buildParams = buildMarketplaceParams;
let calledUrl;
globalThis.fetch = async (url) => { calledUrl = url; return { ok: true, json: async () => ({ data: [], meta: { total: 0 } }) }; };
const { getFilteredProducts } = await import(`data:text/javascript;base64,${Buffer.from(apiSource).toString('base64')}`);
await getFilteredProducts(restored, { page: 3, categoryIds: [2, 3] });
const requested = new URL(calledUrl, 'http://example.test');
assert.equal(requested.pathname, '/api/products');
assert.deepEqual(requested.searchParams.getAll('category_ids[]'), ['2', '3']);
assert.equal(requested.searchParams.get('page'), '3');
assert.equal(requested.searchParams.get('shipping'), '1');
assert.equal(requested.searchParams.get('per_page'), '24');
await assert.rejects(getFilteredProducts({}, { categoryIds: [] }));
globalThis.fetch = async () => ({ ok: false, json: async () => ({ message: 'Invalid filter', errors: { maxPrice: ['Invalid range'] } }) });
await assert.rejects(getFilteredProducts(), (error) => error.errors.maxPrice[0] === 'Invalid range');
console.log('PASS: URL restore/pagination, all boolean filters, zero price, nested category scope, seller round-trip/clearing, API endpoint/payload and validation errors.');
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
async function load(path) {
    const source = await readFile(new URL(path, import.meta.url), 'utf8');
    return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { filterLocations, selectCounty, selectSettlement } = await load('../resources/js/utils/locations.js');
const { buildMarketplaceParams, parseMarketplaceParams } = await load('../resources/js/utils/marketplaceFilters.js');
const { productFiltersFromApi, productFilterPayload } = await load('../resources/js/utils/productFilters.js');
const data = JSON.parse(await readFile(new URL('../database/seeders/data/hungarian-locations.json', import.meta.url), 'utf8'));
assert.equal(data.counties.length, 20);
assert.equal(data.settlements.length, 3155);
assert.equal(new Set(data.settlements.map((item) => item.ksh_code)).size, 3155);
assert.equal(data.settlements.filter((item) => item.name.startsWith('Budapest')).length, 1);
assert.equal(filterLocations(data.counties, 'hajdu')[0].name, 'Hajdú-Bihar');
assert.equal(filterLocations(data.settlements, 'DEBRECEN')[0].name, 'Debrecen');
assert.ok(filterLocations(data.settlements, 'szekesfehervar').some((item) => item.name === 'Székesfehérvár'));
const counties = [{ id: 1, name: 'Hajdú-Bihar' }, { id: 2, name: 'Pest' }];
assert.deepEqual(selectCounty({ county_id: 1, settlement_id: 11, settlement: 'Debrecen' }, counties[1]),
    { county_id: 2, county: 'Pest', settlement_id: null, settlement: '' });
assert.equal(selectCounty({ county_id: '1', settlement_id: 11, settlement: 'Debrecen' }, counties[0]).settlement_id, 11);
assert.deepEqual(selectSettlement({ id: 11, name: 'Debrecen', county_id: 1 }, counties),
    { county_id: 1, county: 'Hajdú-Bihar', settlement_id: 11, settlement: 'Debrecen' });
const original = { county_id: 1, settlement_id: 11, county: 'Hajdú-Bihar', settlement: 'Debrecen', minPrice: '0', shipping: true };
const restored = parseMarketplaceParams(buildMarketplaceParams(original, 3));
assert.equal(restored.county_id, '1');
assert.equal(restored.settlement_id, '11');
assert.equal(restored.county, 'Hajdú-Bihar');
assert.equal(restored.minPrice, '0');
assert.equal(restored.shipping, true);
const form = productFiltersFromApi(original);
assert.equal(productFilterPayload(form).settlement_id, 11);
assert.equal(productFilterPayload({ ...form, county_id: null, settlement_id: null, county: '', settlement: '' }).settlement, null);
console.log('PASS: full dataset integrity, Hungarian matching, county change clearing, settlement-first selection, URL and seller payload round-trips.');
export function normalizeLocationText(value) {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('hu-HU').trim();
}
export function filterLocations(options, query) {
    const words = normalizeLocationText(query).split(/\s+/).filter(Boolean);
    return options.filter((option) => words.every((word) => normalizeLocationText(option.name).includes(word)))
        .sort((a, b) => {
            const normalized = normalizeLocationText(query);
            const aStarts = normalizeLocationText(a.name).startsWith(normalized);
            const bStarts = normalizeLocationText(b.name).startsWith(normalized);
            return aStarts !== bStarts ? (aStarts ? -1 : 1) : a.name.localeCompare(b.name, 'hu');
        });
}
export function selectCounty(location, county) {
    const changed = Number(location.county_id) !== Number(county.id);
    return { county_id: county.id, county: county.name,
        settlement_id: changed ? null : location.settlement_id,
        settlement: changed ? '' : (location.settlement ?? '') };
}
export function selectSettlement(settlement, counties) {
    const county = counties.find((item) => Number(item.id) === Number(settlement.county_id));
    return { county_id: county.id, county: county.name, settlement_id: settlement.id, settlement: settlement.name };
}
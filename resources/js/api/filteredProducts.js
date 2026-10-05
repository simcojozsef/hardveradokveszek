import { buildMarketplaceParams } from '../utils/marketplaceFilters';
export async function getFilteredProducts(state = {}, { page = 1, categoryIds, signal } = {}) {
    const params = buildMarketplaceParams(state, page);
    params.set('per_page', '24');
    if (categoryIds !== undefined) {
        if (!Array.isArray(categoryIds) || !categoryIds.length) throw new Error('Nincs elérhető kategória.');
        categoryIds.forEach((id) => params.append('category_ids[]', String(id)));
    }
    const response = await fetch(`/api/products?${params}`, {
        signal, headers: { Accept: 'application/json' },
    });
    const data = await response.json();
    if (!response.ok) {
        const error = new Error(data.message || 'Nem sikerült betölteni a termékeket.');
        error.errors = data.errors;
        throw error;
    }
    return data;
}
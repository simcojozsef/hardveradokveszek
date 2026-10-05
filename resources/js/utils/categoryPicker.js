export function normalizeCategoryIds(values = []) {
    return [...new Set((Array.isArray(values) ? values : [])
        .map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))];
}
export function flattenCategoryOptions(categories, parents = []) {
    const options = [];
    for (const category of Array.isArray(categories) ? categories : []) {
        const id = Number(category.id);
        const name = String(category.name ?? '');
        const path = [...parents, name];
        options.push({ id, name, parentPath: parents.join(' › '), path: path.join(' › '), level: parents.length });
        const children = Array.isArray(category.children_recursive) && category.children_recursive.length
            ? category.children_recursive : category.children;
        options.push(...flattenCategoryOptions(children, path));
    }
    return options;
}
function normalizeText(value) {
    return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('hu-HU');
}
export function filterCategoryOptions(options, search) {
    const terms = normalizeText(search).trim().split(/\s+/).filter(Boolean);
    return options.filter((option) => terms.every((term) => normalizeText(option.path).includes(term)));
}
export function toggleCategorySelection(current, categoryId, checked) {
    const ids = normalizeCategoryIds(current);
    const id = Number(categoryId);
    if (!Number.isSafeInteger(id) || id < 1) return ids;
    return checked ? normalizeCategoryIds([...ids, id]) : ids.filter((value) => value !== id);
}
export function categoryIdsFromProduct(product) {
    const ids = normalizeCategoryIds(product.category_ids ?? product.categories?.map((category) => category.id));
    const primary = Number(product.category_id);
    return normalizeCategoryIds(Number.isSafeInteger(primary) && primary > 0 ? [primary, ...ids] : ids);
}
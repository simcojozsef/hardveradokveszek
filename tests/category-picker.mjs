import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../resources/js/utils/categoryPicker.js', import.meta.url), 'utf8');
const { flattenCategoryOptions, filterCategoryOptions, toggleCategorySelection, categoryIdsFromProduct } =
    await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const options = flattenCategoryOptions([
    { id: 1, name: 'Számítógép', children_recursive: [
        { id: 2, name: 'Videókártya', children_recursive: [{ id: 3, name: 'NVIDIA' }] },
        { id: 4, name: 'Laptop' },
    ] },
    { id: 5, name: 'Fényképezőgép' },
]);
assert.deepEqual(filterCategoryOptions(options, 'videokartya').map((item) => item.id), [2, 3]);
assert.deepEqual(filterCategoryOptions(options, ' SZAMITOGEP NVIDIA ').map((item) => item.id), [3]);
assert.equal(options.find((item) => item.id === 3).parentPath, 'Számítógép › Videókártya');
let selected = toggleCategorySelection([], 5, true);
selected = toggleCategorySelection(selected, 3, true);
assert.deepEqual(selected, [5, 3]);
// Searching elsewhere must not drop a hidden checked category.
filterCategoryOptions(options, 'laptop');
selected = toggleCategorySelection(selected, 4, true);
assert.deepEqual(selected, [5, 3, 4]);
assert.deepEqual(toggleCategorySelection(selected, 3, true), [5, 3, 4]);
assert.deepEqual(toggleCategorySelection(selected, 5, false), [3, 4]);
assert.deepEqual(categoryIdsFromProduct({ category_id: 5, category_ids: [3, 5, 4] }), [5, 3, 4]);
assert.deepEqual(categoryIdsFromProduct({ category_id: 4 }), [4]);
assert.deepEqual(categoryIdsFromProduct({ category_id: null, categories: [{ id: 3 }, { id: 4 }] }), [3, 4]);
console.log('PASS: Hungarian search, nested paths, multiple selections, hidden selection retention, primary order and legacy product loading.');
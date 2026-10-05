import React, { useMemo } from 'react';
function flattenCategories(categories, level = 0) {
    const result = [];
    for (const category of categories) {
        result.push({ ...category, level });
        if (Array.isArray(category.children_recursive) && category.children_recursive.length > 0) {
            result.push(...flattenCategories(category.children_recursive, level + 1));
        }
    }
    return result;
}
export default function CategorySelect({ categories, value, onChange, required = false }) {
    const options = useMemo(() => flattenCategories(categories), [categories]);
    return (
        <label className="form-field form-field--full"><span>Kategória</span>
            <select value={value} onChange={(event) => onChange(event.target.value)} required={required}>
                <option value="">Válassz kategóriát...</option>
                {options.map((category) => (
                    <option key={category.id} value={category.id}>{'— '.repeat(category.level)}{category.name}</option>
                ))}
            </select>
        </label>
    );
}

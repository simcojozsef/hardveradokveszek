import React, { useId, useMemo, useState } from 'react';
import { flattenCategoryOptions, filterCategoryOptions, normalizeCategoryIds, toggleCategorySelection } from '../utils/categoryPicker';
import '../../css/category-picker.css';

export default function CategoryPicker({ categories, value = [], onChange, required = false, disabled = false }) {
    const id = useId();
    const [search, setSearch] = useState('');
    const options = useMemo(() => flattenCategoryOptions(categories), [categories]);
    const filtered = useMemo(() => filterCategoryOptions(options, search), [options, search]);
    const selectedIds = normalizeCategoryIds(value);
    const selected = new Set(selectedIds);
    const optionsById = new Map(options.map((option) => [option.id, option]));
    const change = (categoryId, checked) => onChange(toggleCategorySelection(selectedIds, categoryId, checked));

    return (
        <fieldset className="category-picker form-field--full" disabled={disabled} aria-describedby={`${id}-help`}>
            <legend>Kategóriák{required ? ' *' : ''}</legend>
            <label className="category-picker__search" htmlFor={`${id}-search`}>
                <span>Kategória keresése</span>
                <input id={`${id}-search`} type="search" value={search}
                    placeholder="Kezdj el gépelni, pl. laptop, videókártya..."
                    onChange={(event) => setSearch(event.target.value)} />
            </label>
            <p id={`${id}-help`} className="category-picker__help">
                {required ? 'Válassz legalább egy kategóriát. ' : ''}
                Több kategóriát is bejelölhetsz. Az első kiválasztott kategória lesz az elsődleges.
            </p>
            <div className="category-picker__summary" aria-live="polite">
                {selectedIds.length} kategória kiválasztva · {filtered.length} találat
            </div>
            {selectedIds.length > 0 && (
                <ul className="category-picker__selected" aria-label="Kiválasztott kategóriák">
                    {selectedIds.map((categoryId, index) => {
                        const option = optionsById.get(categoryId);
                        const label = option?.path ?? `Kategória #${categoryId}`;
                        return (
                            <li key={categoryId}>
                                <span>{label}{index === 0 ? ' (elsődleges)' : ''}</span>
                                <button type="button" onClick={() => change(categoryId, false)} aria-label={`${label} eltávolítása`}>×</button>
                            </li>
                        );
                    })}
                </ul>
            )}
            <div className="category-picker__list">
                {filtered.length ? filtered.map((option) => (
                    <label key={option.id} className={`category-picker__option${selected.has(option.id) ? ' is-selected' : ''}`}>
                        <input type="checkbox" value={option.id} checked={selected.has(option.id)}
                            onChange={(event) => change(option.id, event.target.checked)} />
                        <span className="category-picker__option-text">
                            <strong>{option.name}</strong>
                            {option.parentPath && <small>{option.parentPath}</small>}
                        </span>
                    </label>
                )) : <p className="category-picker__empty">Nincs ilyen kategória. Próbálj másik kifejezést.</p>}
            </div>
            {search && <button type="button" className="secondary-button" onClick={() => setSearch('')}>Keresés törlése</button>}
        </fieldset>
    );
}

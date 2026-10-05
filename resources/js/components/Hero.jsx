import React, { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import CategorySuggestionIcon from './CategorySuggestion';
import LocationSelect from './LocationSelect';
import { EMPTY_SEARCH_FILTERS } from '../utils/marketplaceFilters';
const EMPTY_RESULTS = { categories: [], products: [] };
const EMPTY_FILTERS = EMPTY_SEARCH_FILTERS;
const MAIN_FIELDS = [
    ['minPrice', 'Min. ár:', 'number', 'Ft-tól'],
    ['maxPrice', 'Max. ár:', 'number', 'Ft-ig'],
    ['county', 'Szűkítés megyére:', 'text', 'Megye'],
    ['settlement', 'Szűkítés településre:', 'text', 'Település'],
    ['store', 'Bolt keresése:', 'search', 'Bolt neve'],
    ['excludedWords', 'Kerülendő szavak:', 'text', 'Pl. hibás, sérült'],
    ['brand', 'Márka:', 'text', 'Pl. Samsung'],
    ['model', 'Modell:', 'text', 'Pl. Galaxy S24'],
];
const FILTER_OPTIONS = [
    ['new', 'Új', 'checkbox'],
    ['used', 'Használt', 'checkbox'],
    ['shipping', 'Csomagküldéssel', 'checkbox'],
    ['excludeAi', 'MI tartalom kizárása', 'checkbox'],
    ['warranty', 'Garancia', 'checkbox'],
    ['personalPickup', 'Személyes átvétel', 'checkbox'],
    ['keres', 'Keres', 'checkbox'],
    ['kinal', 'Kínál', 'checkbox'],
    ['trustedSeller', 'Megbízható eladó', 'checkbox'],
];
const FILTER_TIPS = {
    shipping: 'A csomagküldés módját (Foxpost, GLS, Magyar Posta) az eladó határozza meg.',
    excludeAi: 'AI avagy mesterséges intelligencia tartalmak kizárását az eladó bejelölheti termékfeltöltéskor.',
    warranty: 'Garanciális termékeknél az eladónak a garancia lejáratát is meg kell adnia.',
    personalPickup: 'Átveheted a terméket személyesen.',
    trustedSeller: 'Te is lehetsz megbízható eladó, csak jelezz nekünk e-mailben az info@gigapiac.hu e-mailre. Megbízható eladó az lehet, aki legalább 3 éve tevékenykedik a hardver piacon.',
};
function ExtendedSearch({ filters, setFilters, onSubmit }) {
    const tipsId = useId();
    const activeTips = FILTER_OPTIONS.filter(([field]) => filters[field] && FILTER_TIPS[field]);
    const setField = (field, value) => {
        setFilters((current) => ({ ...current, [field]: value }));
    };
    return (
        <form className="extended-search" onSubmit={onSubmit} aria-label="Részletes keresés">
            <div
                className="extended-search__fields"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}
            >
                {MAIN_FIELDS.map(([field, label, type, placeholder]) => field === 'settlement' ? null : field === 'county' ? (
                    <LocationSelect key={field} value={filters}
                        countyLabel="Szűkítés megyére:" settlementLabel="Szűkítés településre:"
                        onChange={(location) => setFilters((current) => ({ ...current, ...location }))} />
                ) : (
                    <label
                        className="extended-search__field"
                        key={field}
                        style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '6px', minWidth: 0 }}
                    >
                        <span style={{ fontWeight: 700 }}>{label}</span>
                        <input
                            type={type}
                            step={type === 'number' ? '0.01' : undefined}
                            min={type === 'number' ? '0' : undefined}
                            name={field}
                            value={filters[field]}
                            onChange={(event) => setField(field, event.target.value)}
                            placeholder={placeholder}
                            style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                        />
                    </label>
                ))}
            </div>
            <fieldset
                className="extended-search__options"
                style={{ display: 'block', minWidth: 0, marginTop: '16px' }}
            >
                <legend style={{ fontWeight: 700 }}>Szűrők:</legend>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 18px' }}>
                    {FILTER_OPTIONS.map(([field, label]) => (
                        <label
                            className="extended-search__check"
                            key={field}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                            <input
                                type="checkbox"
                                name={field}
                                checked={filters[field]}
                                aria-describedby={filters[field] && FILTER_TIPS[field] ? `${tipsId}-${field}` : undefined}
                                onChange={(event) => setField(field, event.target.checked)}
                            />
                            <span>{label}</span>
                        </label>
                    ))}
                </div>
            </fieldset>
            <div
                className="extended-search__tips"
                aria-live="polite"
                aria-relevant="additions text"
                style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '8px', marginTop: activeTips.length ? '12px' : 0 }}
            >
                {activeTips.map(([field]) => (
                    <p
                        id={`${tipsId}-${field}`}
                        key={field}
                        className="extended-search__tip"
                        style={{ margin: 0, lineHeight: 1.5, overflowWrap: 'anywhere' }}
                    >
                        <strong>Tipp:</strong> {FILTER_TIPS[field]}
                    </p>
                ))}
            </div>
            <div className="extended-search__actions">
                <button type="submit" className="extended-search__submit">Keres</button>
            </div>
        </form>
    );
}
export default function Hero({ search = '', setSearch, onSearch, filters: controlledFilters, setFilters: setControlledFilters }) {
    const navigate = useNavigate();
    const sectionRef = useRef(null);
    const listId = useId();
    const [results, setResults] = useState(EMPTY_RESULTS);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [extendedOpen, setExtendedOpen] = useState(false);
    const [localFilters, setLocalFilters] = useState(EMPTY_FILTERS);
    const filters = controlledFilters ?? localFilters;
    const setFilters = setControlledFilters ?? setLocalFilters;
    const query = search.trim();
    const categories = results.categories;
    const products = results.products;
    const options = [...categories, ...products];
    useEffect(() => {
        if (!query) {
            setResults(EMPTY_RESULTS);
            setLoading(false);
            setError(false);
            setOpen(false);
            setActiveIndex(-1);
            return undefined;
        }
        const controller = new AbortController();
        setResults(EMPTY_RESULTS);
        setLoading(true);
        setError(false);
        setActiveIndex(-1);
        const timeout = window.setTimeout(async () => {
            try {
                const response = await fetch(
                    `/api/search/suggestions?q=${encodeURIComponent(query)}`,
                    { signal: controller.signal, headers: { Accept: 'application/json' } },
                );
                if (!response.ok) throw new Error('Suggestions could not be loaded');
                const data = await response.json();
                if (controller.signal.aborted) return;
                setResults({
                    categories: Array.isArray(data.categories) ? data.categories : [],
                    products: Array.isArray(data.products) ? data.products : [],
                });
            } catch (fetchError) {
                if (fetchError.name !== 'AbortError') setError(true);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 200);
        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [query]);
    function closeSuggestions() {
        setOpen(false);
        setActiveIndex(-1);
    }
    function locationsAreValid() {
        const inputs = sectionRef.current?.querySelectorAll('[data-location-input]') ?? [];
        return Array.from(inputs).every((input) => input.reportValidity());
    }
    function handleSubmit(event) {
        event.preventDefault();
        if (!locationsAreValid()) return;
        closeSuggestions();
        onSearch?.(event, { ...filters, query });
    }
    function handleExtendedSubmit(event) {
        event.preventDefault();
        if (!locationsAreValid()) return;
        closeSuggestions();
        // Home and Category use the same API filter contract.
        onSearch?.(event, { ...filters, query });
    }
    function handleKeyDown(event) {
        if (event.key === 'Escape') {
            closeSuggestions();
            return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            if (!query || options.length === 0) return;
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) => {
                if (event.key === 'ArrowDown') return (current + 1) % options.length;
                return current <= 0 ? options.length - 1 : current - 1;
            });
        }
        if (event.key === 'Enter' && open && activeIndex >= 0) {
            event.preventDefault();
            navigate(options[activeIndex].url);
            closeSuggestions();
        }
    }
    function handleBlur(event) {
        if (!event.currentTarget.contains(event.relatedTarget)) closeSuggestions();
    }
    const showSuggestions = open && query.length > 0;
    return (
        <section ref={sectionRef} className="home-hero-refactored" aria-label="Termékkeresés">
            <div className="home-hero__container">
                <div className="home-hero__content">
                    <div className="home-hero__search-wrap" onBlur={handleBlur}>
                        <form className="home-hero__search" role="search" onSubmit={handleSubmit}>
                            <div className="home-hero__search-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24">
                                    <circle cx="11" cy="11" r="6.5" />
                                    <path d="M16 16l5 5" />
                                </svg>
                            </div>
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setOpen(true);
                                }}
                                onFocus={() => query && setOpen(true)}
                                onKeyDown={handleKeyDown}
                                placeholder="Mit keresel? Pl. RTX 4070, Ryzen 7, iPhone..."
                                aria-label="Termék keresése"
                                role="combobox"
                                aria-autocomplete="list"
                                aria-expanded={showSuggestions}
                                aria-controls={showSuggestions ? listId : undefined}
                                aria-activedescendant={
                                    showSuggestions && activeIndex >= 0
                                        ? `${listId}-option-${activeIndex}`
                                        : undefined
                                }
                                autoComplete="off"
                            />
                            <button type="submit">Keresés</button>
                            <button
                                type="button"
                                className={`home-hero__extended-toggle${extendedOpen ? ' is-open' : ''}`}
                                aria-expanded={extendedOpen}
                                aria-controls={`${listId}-extended`}
                                aria-label={extendedOpen ? 'Részletes keresés bezárása' : 'Részletes keresés megnyitása'}
                                onClick={() => setExtendedOpen((current) => !current)}
                            >
                                <svg viewBox="0 0 16 16" aria-hidden="true">
                                    <path d="m3 6 5 5 5-5" />
                                </svg>
                            </button>
                        </form>
                        {extendedOpen && (
                            <div id={`${listId}-extended`}>
                                <ExtendedSearch
                                    filters={filters}
                                    setFilters={setFilters}
                                    onSubmit={handleExtendedSubmit}
                                />
                            </div>
                        )}
                        {showSuggestions && (
                            <div className="search-suggestions" id={listId} role="listbox" aria-label="Keresési javaslatok">
                                {loading && <p className="search-suggestions__status" role="status">Keresés...</p>}
                                {!loading && error && (
                                    <p className="search-suggestions__status" role="status">
                                        A javaslatok most nem érhetők el. A Keresés gombbal tovább kereshetsz.
                                    </p>
                                )}
                                {!loading && !error && options.length === 0 && (
                                    <p className="search-suggestions__status">Nincs javaslat. Próbálj másik kifejezést.</p>
                                )}
                                {!loading && !error && categories.length > 0 && (
                                    <div className="search-suggestions__group" role="group" aria-label="Kategóriák">
                                        <p className="search-suggestions__heading">Kategóriák</p>
                                        {categories.map((category, index) => (
                                            <Link
                                                key={`category-${category.id}`}
                                                id={`${listId}-option-${index}`}
                                                role="option"
                                                aria-selected={activeIndex === index}
                                                to={category.url}
                                                className={`search-suggestions__item${activeIndex === index ? ' is-active' : ''}`}
                                                onClick={closeSuggestions}
                                            >
                                                <CategorySuggestionIcon category={category} />
                                                <span className="search-suggestions__name">{category.name}</span>
                                                <span className="search-suggestions__arrow" aria-hidden="true">→</span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                                {!loading && !error && products.length > 0 && (
                                    <div className="search-suggestions__group" role="group" aria-label="Termékek">
                                        <p className="search-suggestions__heading">Termékek</p>
                                        {products.map((product, index) => {
                                            const optionIndex = categories.length + index;
                                            return (
                                                <Link
                                                    key={`product-${product.id}`}
                                                    id={`${listId}-option-${optionIndex}`}
                                                    role="option"
                                                    aria-selected={activeIndex === optionIndex}
                                                    to={product.url}
                                                    className={`search-suggestions__item${activeIndex === optionIndex ? ' is-active' : ''}`}
                                                    onClick={closeSuggestions}
                                                >
                                                    {product.image ? (
                                                        <img src={product.image} alt="" className="search-suggestions__image" loading="lazy" />
                                                    ) : (
                                                        <span className="search-suggestions__image search-suggestions__image--empty" aria-hidden="true">□</span>
                                                    )}
                                                    <span className="search-suggestions__name">{product.name}</span>
                                                    <strong className="search-suggestions__price">
                                                        {Number(product.price || 0).toLocaleString('hu-HU')} Ft
                                                    </strong>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                                {!loading && !error && options.length > 0 && (
                                    <button type="button" className="search-suggestions__all" onClick={handleSubmit}>
                                        Összes találat erre: „{query}” →
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

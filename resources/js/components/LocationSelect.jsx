import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { getLocations } from '../api/locations';
import { filterLocations, selectCounty, selectSettlement } from '../utils/locations';
import '../../css/location-select.css';

function Typeahead({ label, value = '', options, onSelect, onClear, placeholder, disabled, countyNames }) {
    const id = useId();
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const [query, setQuery] = useState(value ?? '');
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const allMatches = useMemo(() => filterLocations(options, query), [options, query]);
    const matches = allMatches.slice(0, 60);
    const expanded = open && !disabled;
    useEffect(() => {
        setQuery(value ?? '');
        setActive(-1);
        inputRef.current?.setCustomValidity('');
    }, [value]);
    useEffect(() => {
        inputRef.current?.setCustomValidity(query.trim() && query !== (value ?? '') ? 'Válassz a megjelenő találatok közül.' : '');
        setActive(-1);
    }, [query, value]);
    useEffect(() => {
        listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    }, [active]);
    function choose(option) {
        setQuery(option.name);
        inputRef.current?.setCustomValidity('');
        onSelect(option);
        setOpen(false);
        setActive(-1);
    }
    function clear() {
        setQuery('');
        inputRef.current?.setCustomValidity('');
        onClear();
        setActive(-1);
    }
    function handleKeyDown(event) {
        if (event.key === 'Escape') { setOpen(false); setActive(-1); return; }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            if (!matches.length) return;
            setActive((current) => event.key === 'ArrowDown' ? (current + 1) % matches.length
                : current <= 0 ? matches.length - 1 : current - 1);
        }
        if (event.key === 'Enter' && expanded && matches.length) {
            event.preventDefault();
            choose(matches[active >= 0 && active < matches.length ? active : 0]);
        }
    }
    return (
        <div className="location-select__field form-field" onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }}>
            <label htmlFor={`${id}-input`}>{label}</label>
            <div className="location-select__input-wrap">
                <input ref={inputRef} id={`${id}-input`} type="text" value={query} disabled={disabled}
                    data-location-input="true" placeholder={placeholder} autoComplete="off" maxLength={100}
                    role="combobox" aria-autocomplete="list" aria-expanded={expanded}
                    aria-controls={expanded ? `${id}-list` : undefined}
                    aria-activedescendant={expanded && active >= 0 && active < matches.length ? `${id}-option-${active}` : undefined}
                    onFocus={() => setOpen(true)} onKeyDown={handleKeyDown}
                    onChange={(event) => {
                        const text = event.target.value;
                        setQuery(text); setOpen(true); setActive(-1);
                        // Update validity before the browser can submit the form.
                        event.target.setCustomValidity(text.trim() && text !== (value ?? '') ? 'Válassz a megjelenő találatok közül.' : '');
                        if (!text.trim()) clear();
                    }} />
                {query && <button type="button" disabled={disabled} className="location-select__clear" aria-label={`${label} törlése`}
                    onClick={() => { clear(); inputRef.current?.focus(); }}>×</button>}
            </div>
            {expanded && (
                <div className="location-select__dropdown">
                    <div ref={listRef} role="listbox" id={`${id}-list`} aria-label={label} className="location-select__options">
                        {matches.map((option, index) => (
                            <button type="button" role="option" id={`${id}-option-${index}`} key={option.id}
                                aria-selected={active === index} className={active === index ? 'is-active' : ''}
                                onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option)}>
                                <span>{option.name}</span>
                                {countyNames && <small>{countyNames.get(Number(option.county_id))}</small>}
                            </button>
                        ))}
                        {!matches.length && <p role="status">Nincs találat.</p>}
                    </div>
                    {allMatches.length > 60 && <p className="location-select__more">További találatokhoz pontosítsd a keresést.</p>}
                </div>
            )}
        </div>
    );
}

export default function LocationSelect({ value, onChange, countyLabel = 'Megye', settlementLabel = 'Település' }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        let cancelled = false;
        setError('');
        getLocations().then((result) => { if (!cancelled) setData(result); })
            .catch((err) => { if (!cancelled) setError(err.message); });
        return () => { cancelled = true; };
    }, [retry]);
    const counties = data?.counties ?? [];
    const countyNames = useMemo(() => new Map(counties.map((county) => [Number(county.id), county.name])), [data]);
    const settlements = useMemo(() => {
        const all = data?.settlements ?? [];
        return value.county_id ? all.filter((settlement) => Number(settlement.county_id) === Number(value.county_id)) : all;
    }, [data, value.county_id]);
    return (
        <div className="location-select">
            <Typeahead label={countyLabel} value={value.county ?? ''} options={counties}
                placeholder="Írd be a megye nevét..." disabled={!data}
                onSelect={(county) => onChange(selectCounty(value, county))}
                onClear={() => onChange({ county_id: null, county: '', settlement_id: null, settlement: '' })} />
            <Typeahead label={settlementLabel} value={value.settlement ?? ''} options={settlements}
                placeholder="Írd be a település nevét..." disabled={!data} countyNames={countyNames}
                onSelect={(settlement) => onChange(selectSettlement(settlement, counties))}
                onClear={() => onChange({ settlement_id: null, settlement: '' })} />
            {!data && !error && <p className="location-select__status" role="status">Helyadatok betöltése...</p>}
            {error && <div className="location-select__status form-error" role="alert">{error}
                {' '}<button type="button" className="secondary-button" onClick={() => setRetry((value) => value + 1)}>Újrapróbálás</button>
            </div>}
        </div>
    );
}

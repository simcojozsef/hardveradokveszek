import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';

import {
    getReferenceCategories,
    getReferenceCounties,
    getReferenceSettlements,
} from '../api/import';

import '../../css/reference-lists.css';

/*
 * The id lookup pages for the import template.
 *
 * A spreadsheet column holds an id, and an id alone is meaningless, so each of
 * these pages lists the ids a seller needs. They are public and read-only.
 */
const TYPES = {
    categories: {
        title: 'Kategóriák',
        intro: 'A kategóriaazonosítót írd a sablon kategoria_id oszlopába.',
        load: getReferenceCategories,
        columns: [
            ['id', 'kategoria_id'],
            ['name', 'Név'],
            ['parent_id', 'Szülő azonosító'],
        ],
        searchKeys: ['name', 'id'],
    },
    counties: {
        title: 'Megyék',
        intro: 'A megyeazonosítót írd a sablon megye_id oszlopába.',
        load: getReferenceCounties,
        columns: [
            ['id', 'megye_id'],
            ['name', 'Megye'],
        ],
        searchKeys: ['name', 'id'],
    },
    settlements: {
        title: 'Települések',
        intro: 'A településazonosítót írd a sablon telepules_id oszlopába.',
        load: getReferenceSettlements,
        columns: [
            ['id', 'telepules_id'],
            ['name', 'Település'],
            ['county_name', 'Megye'],
        ],
        searchKeys: ['name', 'county_name', 'id'],
    },
};

export default function ReferenceList({ type }) {
    const config = TYPES[type] ?? TYPES.categories;
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        config
            .load()
            .then((response) => {
                if (!cancelled) setRows(response.data ?? []);
            })
            .catch((err) => {
                if (!cancelled) setError(err.message || 'A lista nem tölthető be.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [type]);

    const filtered = useMemo(() => {
        const needle = search.trim().toLowerCase();

        if (!needle) return rows;

        return rows.filter((row) =>
            config.searchKeys.some((key) =>
                String(row[key] ?? '').toLowerCase().includes(needle),
            ),
        );
    }, [rows, search, type]);

    return (
        <div className="reference-page">
            <header className="reference-page__header">
                <div>
                    <p className="eyebrow">Import segédlet</p>
                    <h1>{config.title}</h1>
                    <p className="reference-page__intro">{config.intro}</p>
                </div>

                <Link to="/seller/import" className="secondary-button">
                    ← Vissza az importhoz
                </Link>
            </header>

            <input
                type="search"
                className="reference-page__search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Keresés név vagy azonosító szerint..."
                aria-label="Keresés"
            />

            {loading && <p className="reference-page__state">Betöltés...</p>}
            {error && <p className="reference-page__state reference-page__state--error">{error}</p>}

            {!loading && !error && (
                <>
                    <p className="reference-page__count">
                        {filtered.length} találat
                    </p>

                    <div className="reference-table-wrap">
                        <table className="reference-table">
                            <thead>
                                <tr>
                                    {config.columns.map(([, label]) => (
                                        <th key={label}>{label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((row) => (
                                    <tr key={row.id}>
                                        {config.columns.map(([key]) => (
                                            <td key={key}>{row[key] ?? '—'}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

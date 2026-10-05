import React, { useEffect, useState } from 'react';
import { getCategory, getTopCategories } from '../api/categories';
import { getCategoryIcon } from '../utils/categoryIcons';

const categoryGroups = new Map();

function getCategoryGroup(parentPath) {
    if (!categoryGroups.has(parentPath)) {
        const request = (parentPath ? getCategory(parentPath) : getTopCategories())
            .then((response) => {
                const items = parentPath ? response?.data?.children : response?.data;
                return Array.isArray(items) ? items : [];
            })
            .catch(() => {
                categoryGroups.delete(parentPath);
                return [];
            });
        categoryGroups.set(parentPath, request);
    }

    return categoryGroups.get(parentPath);
}

export default function CategorySuggestionIcon({ category }) {
    const [iconCategory, setIconCategory] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setIconCategory(null);
        setFailed(false);

        const segments = String(category.url ?? '').split('/').filter(Boolean);
        const parentPath = segments.slice(0, -1).join('/');
        const slug = segments[segments.length - 1];

        getCategoryGroup(parentPath).then((siblings) => {
            if (cancelled) return;
            const match = siblings.find((item) =>
                String(item.id) === String(category.id) || item.slug === slug
            );
            setIconCategory(match ?? null);
        });

        return () => {
            cancelled = true;
        };
    }, [category.id, category.url]);

    if (!iconCategory || failed) {
        return <span className="search-suggestions__category-icon" aria-hidden="true">▦</span>;
    }

    return (
        <img
            className="search-suggestions__category-icon"
            src={getCategoryIcon(iconCategory.icon, iconCategory.icon_key)}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
        />
    );
}

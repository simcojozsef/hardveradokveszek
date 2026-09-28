import React, { useMemo } from 'react';

function flattenCategories(
    categories,
    excludedIds = [],
    level = 0
) {
    const result = [];

    for (const category of categories) {
        if (excludedIds.includes(category.id)) {
            continue;
        }

        result.push({
            id: category.id,
            name: category.name,
            level,
        });

        if (
            Array.isArray(
                category.children_recursive
            ) &&
            category.children_recursive.length > 0
        ) {
            result.push(
                ...flattenCategories(
                    category.children_recursive,
                    excludedIds,
                    level + 1
                )
            );
        }
    }

    return result;
}

export default function CategoryParentSelect({
    categories,
    value,
    onChange,
    excludedIds = [],
}) {
    const options = useMemo(
        () =>
            flattenCategories(
                categories,
                excludedIds
            ),
        [categories, excludedIds]
    );

    return (
        <label className="form-field">
            <span>
                Szülőkategória
            </span>

            <select
                value={value ?? ''}
                onChange={(event) =>
                    onChange(
                        event.target.value
                            ? Number(
                                  event.target.value
                              )
                            : null
                    )
                }
            >
                <option value="">
                    Főkategória
                </option>

                {options.map((category) => (
                    <option
                        key={category.id}
                        value={category.id}
                    >
                        {'— '.repeat(
                            category.level
                        )}
                        {category.name}
                    </option>
                ))}
            </select>
        </label>
    );
}
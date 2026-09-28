import React, { useEffect, useState } from 'react';
import CategoryParentSelect from '../../components/CategoryParentSelect';
import { getCategoryIcon } from '../../utils/categoryIcons';

async function getCategories() {
    const response = await fetch(
        '/api/admin/categories',
        {
            headers: {
                Accept: 'application/json',
            },
            credentials: 'include',
        }
    );

    if (!response.ok) {
        throw new Error(
            'Nem sikerült betölteni a kategóriákat.'
        );
    }

    return response.json();
}

async function createCategory(payload) {
    const response = await fetch(
        '/api/admin/categories',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(payload),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ??
                'Nem sikerült létrehozni a kategóriát.'
        );
    }

    return data;
}

async function updateCategory(id, payload) {
    const response = await fetch(
        `/api/admin/categories/${id}`,
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(payload),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ??
                'Nem sikerült frissíteni a kategóriát.'
        );
    }

    return data;
}

async function deleteCategory(id) {
    const response = await fetch(
        `/api/admin/categories/${id}`,
        {
            method: 'DELETE',
            headers: {
                Accept: 'application/json',
            },
            credentials: 'include',
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ??
                'Nem sikerült törölni a kategóriát.'
        );
    }

    return data;
}

async function uploadCategoryIcon(id, file) {
    const formData = new FormData();

    formData.append('icon', file);

    const response = await fetch(
        `/api/admin/categories/${id}/icon`,
        {
            method: 'POST',
            headers: {
                Accept: 'application/json',
            },
            credentials: 'include',
            body: formData,
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ??
                'Nem sikerült feltölteni a kategória ikonját.'
        );
    }

    return data;
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function getChildren(category) {
    return (
        category.childrenRecursive ??
        category.children_recursive ??
        []
    );
}

function getDescendantIds(category) {
    const ids = [category.id];

    function collect(children) {
        if (!Array.isArray(children)) {
            return;
        }

        for (const child of children) {
            ids.push(child.id);

            collect(
                getChildren(child)
            );
        }
    }

    collect(
        getChildren(category)
    );

    return ids;
}

/*
|--------------------------------------------------------------------------
| Category tree node
|--------------------------------------------------------------------------
*/

function CategoryNode({
    category,
    level = 0,
    onEdit,
    onAddChild,
    onDelete,
    onToggle,
    onUploadIcon,
}) {
    const [expanded, setExpanded] =
        useState(true);

    const children =
        getChildren(category);

    const hasChildren =
        children.length > 0;

    const inputId =
        `category-icon-${category.id}`;

    const iconSrc =
        getCategoryIcon(
            category.icon,
            category.icon_key
        );

    return (
        <div className="admin-category-node">
            <div
                className="admin-category-row"
                style={{
                    paddingLeft:
                        `${level * 28 + 12}px`,
                }}
            >
                <button
                    type="button"
                    className="admin-category-expand"
                    onClick={() =>
                        setExpanded(
                            (current) =>
                                !current
                        )
                    }
                    disabled={!hasChildren}
                    aria-label={
                        hasChildren
                            ? expanded
                                ? 'Összecsukás'
                                : 'Kinyitás'
                            : undefined
                    }
                >
                    {hasChildren
                        ? expanded
                            ? '▼'
                            : '▶'
                        : '•'}
                </button>

                <div className="admin-category-main">
                    <div className="admin-category-icon">
                        <img
                            src={iconSrc}
                            alt=""
                        />
                    </div>

                    <div>
                        <strong>
                            {category.name}
                        </strong>

                        <span>
                            /{category.slug}
                        </span>
                    </div>
                </div>

                <span
                    className={
                        category.is_active
                            ? 'admin-status-badge admin-status-badge--active'
                            : 'admin-status-badge admin-status-badge--inactive'
                    }
                >
                    {category.is_active
                        ? 'Aktív'
                        : 'Inaktív'}
                </span>

                <div className="admin-category-actions">
                    <button
                        type="button"
                        className="admin-view-button"
                        onClick={() =>
                            onAddChild(category)
                        }
                    >
                        + Alkategória
                    </button>

                    <button
                        type="button"
                        className="admin-view-button"
                        onClick={() =>
                            onEdit(category)
                        }
                    >
                        Szerkesztés
                    </button>

                    <button
                        type="button"
                        className="admin-view-button"
                        onClick={() =>
                            onToggle(category)
                        }
                    >
                        {category.is_active
                            ? 'Inaktiválás'
                            : 'Aktiválás'}
                    </button>

                    <input
                        id={inputId}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        hidden
                        onChange={(event) => {
                            const file =
                                event.target
                                    .files?.[0];

                            onUploadIcon(
                                category,
                                file
                            );

                            event.target.value =
                                '';
                        }}
                    />

                    <label
                        htmlFor={inputId}
                        className="admin-view-button"
                    >
                        Ikon
                    </label>

                    <button
                        type="button"
                        className="admin-view-button admin-view-button--danger"
                        onClick={() =>
                            onDelete(category)
                        }
                    >
                        Törlés
                    </button>
                </div>
            </div>

            {expanded &&
                hasChildren && (
                    <div>
                        {children.map(
                            (child) => (
                                <CategoryNode
                                    key={
                                        child.id
                                    }
                                    category={
                                        child
                                    }
                                    level={
                                        level + 1
                                    }
                                    onEdit={
                                        onEdit
                                    }
                                    onAddChild={
                                        onAddChild
                                    }
                                    onDelete={
                                        onDelete
                                    }
                                    onToggle={
                                        onToggle
                                    }
                                    onUploadIcon={
                                        onUploadIcon
                                    }
                                />
                            )
                        )}
                    </div>
                )}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Main component
|--------------------------------------------------------------------------
*/

export default function Categories() {
    const [categories, setCategories] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState('');

    const [
        editingCategory,
        setEditingCategory,
    ] = useState(null);

    const [
        parentCategory,
        setParentCategory,
    ] = useState(null);

    const [parentId, setParentId] =
        useState(null);

    const [name, setName] =
        useState('');

    const [slug, setSlug] =
        useState('');

    const [description, setDescription] =
        useState('');

    /*
    |--------------------------------------------------------------------------
    | Load categories
    |--------------------------------------------------------------------------
    */

    async function loadCategories() {
        try {
            setLoading(true);
            setError('');

            const response =
                await getCategories();

            setCategories(
                response.data ?? []
            );
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadCategories();
    }, []);

    /*
    |--------------------------------------------------------------------------
    | Form helpers
    |--------------------------------------------------------------------------
    */

    function resetForm() {
        setEditingCategory(null);
        setParentCategory(null);
        setParentId(null);
        setName('');
        setSlug('');
        setDescription('');
    }

    function handleNewCategory() {
        resetForm();
    }

    function handleAddChild(category) {
        setEditingCategory(null);
        setParentCategory(category);
        setParentId(category.id);
        setName('');
        setSlug('');
        setDescription('');
    }

    function handleEdit(category) {
        setEditingCategory(category);
        setParentCategory(null);

        setParentId(
            category.parent_id ?? null
        );

        setName(category.name);
        setSlug(category.slug ?? '');
        setDescription(
            category.description ?? ''
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Create / update
    |--------------------------------------------------------------------------
    */

    async function handleSubmit(event) {
        event.preventDefault();

        try {
            setError('');

            const payload = {
                name,
                slug: slug || null,
                description:
                    description || null,
                parent_id: parentId,
            };

            if (editingCategory) {
                await updateCategory(
                    editingCategory.id,
                    payload
                );
            } else {
                await createCategory(
                    payload
                );
            }

            resetForm();

            await loadCategories();
        } catch (err) {
            setError(err.message);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Delete
    |--------------------------------------------------------------------------
    */

    async function handleDelete(category) {
        const confirmed =
            window.confirm(
                `Biztosan törölni szeretnéd a(z) "${category.name}" kategóriát?`
            );

        if (!confirmed) {
            return;
        }

        try {
            setError('');

            await deleteCategory(
                category.id
            );

            if (
                editingCategory?.id ===
                category.id
            ) {
                resetForm();
            }

            await loadCategories();
        } catch (err) {
            setError(err.message);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Activate / deactivate
    |--------------------------------------------------------------------------
    */

    async function handleToggle(category) {
        try {
            setError('');

            await updateCategory(
                category.id,
                {
                    name: category.name,
                    slug: category.slug,
                    description:
                        category.description,
                    parent_id:
                        category.parent_id,
                    sort_order:
                        category.sort_order,
                    is_active:
                        !category.is_active,
                }
            );

            await loadCategories();
        } catch (err) {
            setError(err.message);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Icon upload
    |--------------------------------------------------------------------------
    */

    async function handleUploadIcon(
        category,
        file
    ) {
        if (!file) {
            return;
        }

        try {
            setError('');

            await uploadCategoryIcon(
                category.id,
                file
            );

            await loadCategories();
        } catch (err) {
            setError(err.message);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Form title
    |--------------------------------------------------------------------------
    */

    const formTitle =
        editingCategory
            ? 'Kategória szerkesztése'
            : parentCategory
                ? `Alkategória hozzáadása: ${parentCategory.name}`
                : 'Új kategória';

    /*
    |--------------------------------------------------------------------------
    | Parent selector exclusions
    |--------------------------------------------------------------------------
    */

    const excludedParentIds =
        editingCategory
            ? getDescendantIds(
                  editingCategory
              )
            : [];

    /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
    */

    return (
        <div className="admin-page">
            <header className="admin-page__header">
                <div>
                    <p className="eyebrow">
                        Adminisztráció
                    </p>

                    <h1>
                        Kategóriák
                    </h1>

                    <p className="admin-page__description">
                        A piactér kategóriáinak
                        és korlátlan mélységű
                        alkategóriáinak kezelése.
                    </p>
                </div>

                <button
                    type="button"
                    className="button"
                    onClick={
                        handleNewCategory
                    }
                >
                    + Új kategória
                </button>
            </header>

            {error && (
                <div className="form-error">
                    {error}
                </div>
            )}

            <div className="admin-category-layout">
                {/* ====================================================== */}
                {/* Category tree                                           */}
                {/* ====================================================== */}

                <section className="dashboard-card admin-list-card">
                    <div className="admin-list-card__header">
                        <div>
                            <p className="eyebrow">
                                Kategóriafa
                            </p>

                            <h2>
                                {
                                    categories.length
                                }{' '}
                                fő kategória
                            </h2>
                        </div>
                    </div>

                    {loading ? (
                        <div className="admin-empty-state">
                            Kategóriák betöltése...
                        </div>
                    ) : categories.length ===
                      0 ? (
                        <div className="admin-empty-state">
                            <strong>
                                Még nincs
                                kategória.
                            </strong>

                            <p>
                                Hozd létre az első
                                kategóriát.
                            </p>
                        </div>
                    ) : (
                        <div className="admin-category-tree">
                            {categories.map(
                                (category) => (
                                    <CategoryNode
                                        key={
                                            category.id
                                        }
                                        category={
                                            category
                                        }
                                        onEdit={
                                            handleEdit
                                        }
                                        onAddChild={
                                            handleAddChild
                                        }
                                        onDelete={
                                            handleDelete
                                        }
                                        onToggle={
                                            handleToggle
                                        }
                                        onUploadIcon={
                                            handleUploadIcon
                                        }
                                    />
                                )
                            )}
                        </div>
                    )}
                </section>

                {/* ====================================================== */}
                {/* Category form                                           */}
                {/* ====================================================== */}

                <section className="dashboard-card">
                    <div className="admin-list-card__header">
                        <div>
                            <p className="eyebrow">
                                Kezelés
                            </p>

                            <h2>
                                {formTitle}
                            </h2>
                        </div>
                    </div>

                    <form
                        className="admin-category-form"
                        onSubmit={
                            handleSubmit
                        }
                    >
                        <label className="form-field">
                            <span>
                                Név
                            </span>

                            <input
                                type="text"
                                value={name}
                                onChange={(
                                    event
                                ) =>
                                    setName(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                required
                            />
                        </label>

                        <label className="form-field">
                            <span>
                                Slug
                            </span>

                            <input
                                type="text"
                                value={slug}
                                onChange={(
                                    event
                                ) =>
                                    setSlug(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                placeholder="Automatikusan generálódik, ha üresen hagyod."
                            />
                        </label>

                        <CategoryParentSelect
                            categories={
                                categories
                            }
                            value={parentId}
                            onChange={
                                setParentId
                            }
                            excludedIds={
                                excludedParentIds
                            }
                        />

                        <label className="form-field">
                            <span>
                                Leírás
                            </span>

                            <textarea
                                value={
                                    description
                                }
                                onChange={(
                                    event
                                ) =>
                                    setDescription(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                rows={5}
                            />
                        </label>

                        {parentCategory &&
                            !editingCategory && (
                                <div className="admin-category-parent">
                                    <span>
                                        Új kategória
                                        szülője
                                    </span>

                                    <strong>
                                        {
                                            parentCategory.name
                                        }
                                    </strong>
                                </div>
                            )}

                        {editingCategory && (
                            <div className="admin-category-parent">
                                <span>
                                    Jelenlegi
                                    kategória
                                </span>

                                <strong>
                                    {
                                        editingCategory.name
                                    }
                                </strong>
                            </div>
                        )}

                        <div className="refund-details__actions">
                            <button
                                type="submit"
                                className="button"
                            >
                                {editingCategory
                                    ? 'Mentés'
                                    : 'Kategória létrehozása'}
                            </button>

                            {(editingCategory ||
                                parentCategory ||
                                name ||
                                slug ||
                                description ||
                                parentId) && (
                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={
                                        resetForm
                                    }
                                >
                                    Mégse
                                </button>
                            )}
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
}
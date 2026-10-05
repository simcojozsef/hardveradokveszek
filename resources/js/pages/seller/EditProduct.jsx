import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getCategoryTree } from '../../api/categories';
import SellerProductStatus from '../../components/SellerProductStatus';
import CategoryPicker from '../../components/CategoryPicker';
import { categoryIdsFromProduct } from '../../utils/categoryPicker';
import {
    getProduct,
    updateProduct,
    getProductImages,
    updateProductImage,
    uploadProductImage,
    deleteProductImage,
} from '../../api/seller';
import ProductFilterFields from '../../components/ProductFilterFields';
import { EMPTY_PRODUCT_FILTERS, productFiltersFromApi, productFilterPayload, formatApiError } from '../../utils/productFilters';
export default function EditProduct() {
    const { id } = useParams();
    const [categories, setCategories] = useState([]);
    const [product, setProduct] = useState(null);
    const [form, setForm] = useState({
        ...EMPTY_PRODUCT_FILTERS,
        name: '',
        description: '',
        price: '',
        stock: '',
        category_ids: [],
    });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [images, setImages] = useState([]);
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState('');
    const [newGalleryFiles, setNewGalleryFiles] = useState([]);
    const [uploadingImages, setUploadingImages] = useState(false);
    useEffect(() => {
        async function loadData() {
            try {
                const [productResponse, imageResponse, categoryResponse] =
                    await Promise.all([
                        getProduct(id),
                        getProductImages(id),
                        getCategoryTree(),
                    ]);
                const data = productResponse.data;
                setProduct(data);
                setForm({
                    ...productFiltersFromApi(data),
                    category_ids: categoryIdsFromProduct(data),
                    name: data.name ?? '',
                    description: data.description ?? '',
                    price: data.price ?? '',
                    stock: data.stock ?? '',
                });
                setImages(imageResponse.data);
                setCategories(categoryResponse.data ?? []);
            } catch (err) {
                setError(formatApiError(err));
            } finally {
                setLoading(false);
                setImageLoading(false);
            }
        }
        loadData();
    }, [id]);
    function handleChange(event) {
        setForm((current) => ({
            ...current,
            [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
        }));
    }
    async function handleSubmit(event) {
        event.preventDefault();
        if (submitting) return;
        if (!form.category_ids.length) {
            setError('Válassz legalább egy kategóriát.');
            return;
        }
        if (form.shipping_available && form.shipping_methods.length === 0) {
            setError('Válassz legalább egy csomagküldési módot.');
            return;
        }
        setSubmitting(true);
        setError('');
        setSuccess('');
        try {
            const response = await updateProduct(id, {
                ...productFilterPayload(form),
                category_ids: form.category_ids,
                name: form.name,
                description: form.description,
                price: Number(form.price),
                stock: Number(form.stock),
            });
            setProduct((current) => ({
                ...current,
                ...response.data,
            }));
            setSuccess('A termék sikeresen frissítve.');
        } catch (err) {
            setError(formatApiError(err));
        } finally {
            setSubmitting(false);
        }
    }
    if (loading) {
        return (
            <div className="seller-page">
                <p>Termék betöltése...</p>
            </div>
        );
    }
    if (!product) {
        return (
            <div className="seller-page">
                <h1>Termék nem található</h1>
                <Link
                    to="/seller/products"
                    className="button"
                >
                    Vissza a termékekhez
                </Link>
            </div>
        );
    }
    async function handleSetPrimary(image) {
        try {
            setImageError('');
            const response = await updateProductImage(
                image.id,
                {
                    sortOrder: image.sort_order,
                    isPrimary: true,
                },
            );
            setImages((current) =>
                current.map((item) => ({
                    ...item,
                    is_primary:
                        item.id === image.id,
                })),
            );
            return response;
        } catch (err) {
            setImageError(err.message);
        }
    }
    async function moveImage(image, direction) {
        const sorted = [...images].sort(
            (a, b) => a.sort_order - b.sort_order,
        );
        const index = sorted.findIndex(
            (item) => item.id === image.id,
        );
        const newIndex = index + direction;
        if (
            newIndex < 0 ||
            newIndex >= sorted.length
        ) {
            return;
        }
        const other = sorted[newIndex];
        try {
            setImageError('');
            await Promise.all([
                updateProductImage(image.id, {
                    sortOrder: other.sort_order,
                    isPrimary: image.is_primary,
                }),
                updateProductImage(other.id, {
                    sortOrder: image.sort_order,
                    isPrimary: other.is_primary,
                }),
            ]);
            const reordered = [...sorted];
            [
                reordered[index],
                reordered[newIndex],
            ] = [
                reordered[newIndex],
                reordered[index],
            ];
            setImages(
                reordered.map((item) => ({
                    ...item,
                    sort_order: item.id === image.id ? other.sort_order : item.id === other.id ? image.sort_order : item.sort_order,
                })),
            );
        } catch (err) {
            setImageError(err.message);
        }
    }
    async function handleDeleteImage(image) {
        const confirmed = window.confirm(
            `Biztosan törölni szeretnéd ezt a képet?`,
        );
        if (!confirmed) {
            return;
        }
        try {
            setImageError('');
            await deleteProductImage(image.id);
            setImages((current) =>
                current
                    .filter((item) => item.id !== image.id),
            );
        } catch (err) {
            setImageError(err.message);
        }
    }
    return (
        <div className="seller-page">
            <div className="seller-page__header">
                <div>
                    <p className="eyebrow">Termékek</p>
                    <h1>Szerkesztés</h1>
                </div>
                <Link
                    to="/seller/products"
                    className="secondary-button"
                >
                    ← Vissza
                </Link>
            </div>
            <section className="dashboard-card">
                <h2>Hirdetés állapota</h2>
                <SellerProductStatus key={product.id} product={product}
                    onChange={(updated) => setProduct((current) => ({ ...current, ...updated }))}
                    disabled={submitting} />
                <p>A szerkesztés nem hosszabbítja meg a 60 napos érvényességet.</p>
            </section>
            <form
                className="product-form"
                onSubmit={handleSubmit}
            >
                {error && (
                    <div className="form-error">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="form-success">
                        {success}
                    </div>
                )}
                <section className="dashboard-card">
                    <h2>Termékadatok</h2>
                    <div className="form-grid">
                        <label className="form-field form-field--full">
                            <span>Termék neve</span>
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                required
                            />
                        </label>
                        <label className="form-field form-field--full">
                            <span>Leírás</span>
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                rows={7}
                            />
                        </label>
                        <CategoryPicker categories={categories} value={form.category_ids}
                            onChange={(category_ids) => setForm((current) => ({ ...current, category_ids }))}
                            disabled={submitting} required />
                        <label className="form-field">
                            <span>Ár (Ft)</span>
                            <input
                                type="number"
                                name="price"
                                value={form.price}
                                onChange={handleChange}
                                min="0"
                                step="0.01"
                                required
                            />
                        </label>
                        <label className="form-field">
                            <span>Készlet</span>
                            <input
                                type="number"
                                name="stock"
                                value={form.stock}
                                onChange={handleChange}
                                min="0"
                                step="1"
                                required
                            />
                        </label>
                    </div>
                </section>
                <ProductFilterFields form={form} setForm={setForm} trustedSeller={product.store?.is_trusted_seller} />
                <section className="dashboard-card">
    <div className="dashboard-card__header">
        <div>
            <p className="eyebrow">Média</p>
            <h2>Termék képei</h2>
        </div>
    </div>
    {imageError && (
        <div className="form-error">
            {imageError}
        </div>
    )}
    {imageLoading ? (
        <p>Képek betöltése...</p>
    ) : images.length === 0 ? (
        <p>Ehhez a termékhez még nincs kép.</p>
    ) : (
        <div className="image-manager">
            {[...images]
                .sort(
                    (a, b) =>
                        a.sort_order -
                        b.sort_order,
                )
                .map((image, index) => (
                    <article
                        key={image.id}
                        className="image-manager__item"
                    >
                        <div className="image-manager__preview">
                            <img
                                src={image.url}
                                alt=""
                            />
                        </div>
                        <div className="image-manager__info">
                            <strong>
                                {image.is_primary
                                    ? 'Kiemelt kép'
                                    : `Galéria ${index}`}
                            </strong>
                            <span>
                                Sorrend: {image.sort_order}
                            </span>
                        </div>
                        <div className="image-manager__actions">
                            {!image.is_primary && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleSetPrimary(
                                            image,
                                        )
                                    }
                                >
                                    Kiemelés
                                </button>
                            )}
                            <button
                                type="button"
                                disabled={index === 0}
                                onClick={() =>
                                    moveImage(
                                        image,
                                        -1,
                                    )
                                }
                            >
                                ↑
                            </button>
                            <button
                                type="button"
                                disabled={
                                    index ===
                                    images.length - 1
                                }
                                onClick={() =>
                                    moveImage(
                                        image,
                                        1,
                                    )
                                }
                            >
                                ↓
                            </button>
                            <label className="secondary-button">
                                Kép cseréje
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    hidden
                                    onChange={async (event) => {
                                        const file =
                                            event.target.files?.[0];
                                        if (!file) {
                                            return;
                                        }
                                        try {
                                            await updateProductImage(
                                                image.id,
                                                {
                                                    sortOrder:
                                                        image.sort_order,
                                                    isPrimary:
                                                        image.is_primary,
                                                    file,
                                                },
                                            );
                                            const updated =
                                                await getProductImages(
                                                    id,
                                                );
                                            setImages(
                                                updated.data,
                                            );
                                        } catch (err) {
                                            setImageError(
                                                err.message,
                                            );
                                        }
                                        event.target.value =
                                            '';
                                    }}
                                />
                            </label>
                            <button
                                type="button"
                                className="danger-button"
                                onClick={() =>
                                    handleDeleteImage(
                                        image,
                                    )
                                }
                            >
                                Törlés
                            </button>
                        </div>
                    </article>
                ))}
        </div>
    )}
</section>
<div className="image-manager__upload">
    <label className="secondary-button">
        + Galéria képek hozzáadása
        <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={(event) => {
                setNewGalleryFiles(
                    Array.from(
                        event.target.files ?? [],
                    ),
                );
            }}
        />
    </label>
    {newGalleryFiles.length > 0 && (
        <button
            type="button"
            className="button"
            disabled={uploadingImages}
            onClick={async () => {
                try {
                    setUploadingImages(true);
                    setImageError('');
                    const startingOrder = images.length
                        ? Math.max(...images.map((image) => Number(image.sort_order))) + 1 : 0;
                    for (
                        let index = 0;
                        index < newGalleryFiles.length;
                        index++
                    ) {
                        await uploadProductImage(
                            id,
                            newGalleryFiles[index],
                            {
                                sortOrder:
                                    startingOrder +
                                    index,
                                isPrimary: false,
                            },
                        );
                    }
                    const updated =
                        await getProductImages(id);
                    setImages(updated.data);
                    setNewGalleryFiles([]);
                } catch (err) {
                    setImageError(
                        err.message,
                    );
                } finally {
                    setUploadingImages(false);
                }
            }}
        >
            {uploadingImages
                ? 'Feltöltés...'
                : `${newGalleryFiles.length} kép feltöltése`}
        </button>
    )}
</div>
                <div className="product-form__actions">
                    <Link
                        to="/seller/products"
                        className="secondary-button"
                    >
                        Mégse
                    </Link>
                    <button
                        type="submit"
                        className="seller-button"
                        disabled={submitting}
                    >
                        {submitting
                            ? 'Mentés...'
                            : 'Változtatások mentése'}
                    </button>
                </div>
            </form>
        </div>
    );
}

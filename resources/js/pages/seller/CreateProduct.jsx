import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
    createProduct,
    getMyStore,
    uploadProductImage,
} from '../../api/seller';
import {
    getCategoryTree,
} from '../../api/categories';
import CategoryPicker from '../../components/CategoryPicker';
import ProductFilterFields from '../../components/ProductFilterFields';
import { EMPTY_PRODUCT_FILTERS, productFilterPayload, formatApiError } from '../../utils/productFilters';
export default function CreateProduct() {
    const navigate = useNavigate();
    const [createdProduct, setCreatedProduct] = useState(null);
    const [store, setStore] = useState(null);
    const [categories, setCategories] =
        useState([]);
    const [form, setForm] = useState({
        ...EMPTY_PRODUCT_FILTERS,
        name: '',
        description: '',
        price: '',
        stock: '',
        category_ids: [],
    });
    const [featuredImage, setFeaturedImage] =
        useState(null);
    const [galleryImages, setGalleryImages] =
        useState([]);
    const [loadingStore, setLoadingStore] =
        useState(true);
    const [loadingCategories, setLoadingCategories] =
        useState(true);
    const [submitting, setSubmitting] =
        useState(false);
    const [error, setError] = useState('');
    const [uploadProgress, setUploadProgress] =
        useState('');
    useEffect(() => {
        async function loadData() {
            try {
                const [
                    storeResponse,
                    categoryResponse,
                ] = await Promise.all([
                    getMyStore(),
                    getCategoryTree(),
                ]);
                setStore(
                    storeResponse.data
                );
                setCategories(
                    categoryResponse.data ?? []
                );
            } catch (err) {
                console.error(
                    'PRODUCT CREATION ERROR:',
                    err
                );
                const validationMessage =
                    err.errors
                        ? Object.entries(
                            err.errors
                        )
                            .map(
                                ([
                                    field,
                                    messages,
                                ]) =>
                                    `${field}: ${messages.join(
                                        ', '
                                    )}`
                            )
                            .join('\n')
                        : null;
                setError(
                    validationMessage ||
                    err.message ||
                    'A termék létrehozása sikertelen.'
                );
            } finally {
                setLoadingStore(false);
                setLoadingCategories(false);
            }
        }
        loadData();
    }, []);
    function handleChange(event) {
        setForm((current) => ({
            ...current,
            [event.target.name]:
                event.target.type === 'checkbox' ? event.target.checked : event.target.value,
        }));
    }
    function handleFeaturedImage(event) {
        const file =
            event.target.files?.[0] ?? null;
        setFeaturedImage(file);
    }
    function handleGalleryImages(event) {
        const files = Array.from(
            event.target.files ?? []
        );
        setGalleryImages(files);
    }
    async function handleSubmit(event) {
        event.preventDefault();
        setError('');
        if (submitting || createdProduct) return;
        if (!store) {
            setError(
                'Nincs elérhető üzlet.'
            );
            return;
        }
        if (!form.category_ids.length) {
            setError(
                'Válassz legalább egy kategóriát.'
            );
            return;
        }
        if (form.shipping_available && form.shipping_methods.length === 0) {
            setError('Válassz legalább egy csomagküldési módot.');
            return;
        }
        if (!featuredImage) {
            setError(
                'Adj meg egy kiemelt képet.'
            );
            return;
        }
        setSubmitting(true);
        try {
            const productResponse =
                await createProduct(
                    store.slug,
                    {
                        ...productFilterPayload(form),
                        name: form.name,
                        description:
                            form.description,
                        price: Number(
                            form.price
                        ),
                        stock: Number(
                            form.stock
                        ),
                        category_ids: form.category_ids,
                    }
                );
            const product =
                productResponse.product;
            setCreatedProduct(product);
            setUploadProgress(
                'Kiemelt kép feltöltése...'
            );
            await uploadProductImage(
                product.id,
                featuredImage,
                {
                    sortOrder: 0,
                    isPrimary: true,
                }
            );
            for (
                let index = 0;
                index <
                galleryImages.length;
                index++
            ) {
                setUploadProgress(
                    `Galéria képek feltöltése... ${
                        index + 1
                    }/${galleryImages.length}`
                );
                await uploadProductImage(
                    product.id,
                    galleryImages[index],
                    {
                        sortOrder:
                            index + 1,
                        isPrimary:
                            false,
                    }
                );
            }
            navigate(
                '/seller/products'
            );
        } catch (err) {
            setError(formatApiError(err));
        } finally {
            setSubmitting(false);
            setUploadProgress('');
        }
    }
    if (
        loadingStore ||
        loadingCategories
    ) {
        return (
            <div className="seller-page">
                <p>
                    Adatok betöltése...
                </p>
            </div>
        );
    }
    if (!store) {
        return (
            <div className="seller-page">
                <h1>
                    Termék létrehozása
                </h1>
                <p>
                    Először létre kell
                    hoznod egy üzletet.
                </p>
                <Link
                    to="/seller/store/create"
                    className="seller-button"
                >
                    Üzlet létrehozása
                </Link>
            </div>
        );
    }
    return (
        <div className="seller-page">
            <div className="seller-page__header">
                <div>
                    <p className="eyebrow">
                        Termékek
                    </p>
                    <h1>
                        Új termék
                    </h1>
                </div>
                <Link
                    to="/seller/products"
                    className="secondary-button"
                >
                    Mégse
                </Link>
            </div>
            <form
                className="product-form"
                onSubmit={
                    handleSubmit
                }
            >
                {error && (
                    <div className="form-error">
                        {error}
                    </div>
                )}
                <section className="dashboard-card">
                    <h2>Alapadatok</h2>
                    <div className="form-grid">
                        <label className="form-field form-field--full">
                            <span>
                                Termék neve
                            </span>
                            <input
                                type="text"
                                name="name"
                                value={
                                    form.name
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="pl. ASUS B650"
                                required
                            />
                        </label>
                        <label className="form-field form-field--full">
                            <span>
                                Leírás
                            </span>
                            <textarea
                                name="description"
                                value={
                                    form.description
                                }
                                onChange={
                                    handleChange
                                }
                                rows={6}
                                placeholder="Írd le a terméket..."
                            />
                        </label>
                        <CategoryPicker
                            categories={categories}
                            value={form.category_ids}
                            onChange={(category_ids) => setForm((current) => ({ ...current, category_ids }))}
                            disabled={submitting || Boolean(createdProduct)}
                            required
                        />
                        <label className="form-field">
                            <span>
                                Ár (Ft)
                            </span>
                            <input
                                type="number"
                                name="price"
                                value={
                                    form.price
                                }
                                onChange={
                                    handleChange
                                }
                                min="0"
                                step="0.01"
                                required
                            />
                        </label>
                        <label className="form-field">
                            <span>
                                Készlet
                            </span>
                            <input
                                type="number"
                                name="stock"
                                value={
                                    form.stock
                                }
                                onChange={
                                    handleChange
                                }
                                min="0"
                                step="1"
                                required
                            />
                        </label>
                    </div>
                </section>
                <ProductFilterFields form={form} setForm={setForm} trustedSeller={store?.is_trusted_seller} />
                {createdProduct && (
                    <p role="status">A termék már létrejött. Ha egy kép feltöltése sikertelen volt, itt folytathatod: <Link to={`/seller/products/${createdProduct.id}/edit`}>Termék szerkesztése</Link>.</p>
                )}
                <section className="dashboard-card">
                    <h2>Képek</h2>
                    <div className="image-upload-grid">
                        <label className="upload-box">
                            <span>
                                Kiemelt kép
                            </span>
                            <small>
                                Ez jelenik meg a
                                termék fő képének.
                            </small>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={
                                    handleFeaturedImage
                                }
                                required
                            />
                            {featuredImage && (
                                <strong>
                                    {
                                        featuredImage.name
                                    }
                                </strong>
                            )}
                        </label>
                        <label className="upload-box">
                            <span>
                                Galéria képek
                            </span>
                            <small>
                                Több kép is
                                kiválasztható.
                            </small>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                onChange={
                                    handleGalleryImages
                                }
                            />
                            {galleryImages.length >
                                0 && (
                                <strong>
                                    {
                                        galleryImages.length
                                    }{' '}
                                    kép
                                    kiválasztva
                                </strong>
                            )}
                        </label>
                    </div>
                </section>
                {uploadProgress && (
                    <div className="upload-status">
                        {uploadProgress}
                    </div>
                )}
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
                        disabled={
                            submitting || Boolean(createdProduct)
                        }
                    >
                        {submitting
                            ? 'Mentés...'
                            : 'Termék létrehozása'}
                    </button>
                </div>
            </form>
        </div>
    );
}

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getMyProducts, deleteProduct } from '../../api/seller';
import SellerProductStatus from '../../components/SellerProductStatus';
import { formatApiError } from '../../utils/productFilters';
export default function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError('');
        async function loadProducts() {
            try {
                const response = await getMyProducts(page);
                if (!cancelled) { setProducts(response.data ?? []); setPagination(response.meta ?? null); }
            } catch (err) {
                if (!cancelled) setError(formatApiError(err));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        loadProducts();
        return () => { cancelled = true; };
    }, [page]);
    async function handleDelete(product) {
        if (deletingId !== null || !window.confirm(`Biztosan törölni szeretnéd ezt a terméket?\n\n${product.name}`)) return;
        try {
            setDeletingId(product.id);
            setError('');
            await deleteProduct(product.id);
            if (products.length === 1 && page > 1) setPage((current) => current - 1);
            else {
                setProducts((current) => current.filter((item) => item.id !== product.id));
                setPagination((current) => current ? ({ ...current, total: Math.max(0, current.total - 1),
                    last_page: Math.max(1, Math.ceil((current.total - 1) / current.per_page)) }) : null);
            }
        } catch (err) { setError(formatApiError(err)); }
        finally { setDeletingId(null); }
    }
    if (loading) return <div className="seller-page"><p>Termékek betöltése...</p></div>;
    return (
        <div className="seller-page">
            <div className="seller-page__header">
                <div><p className="eyebrow">Üzlet</p><h1>Termékek</h1></div>
                <Link to="/seller/products/create" className="seller-button">+ Új termék</Link>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            {products.length === 0 && !error ? (
                <section className="dashboard-card"><h2>Még nincs termék</h2>
                    <p>Hozd létre az első termékedet.</p>
                    <Link to="/seller/products/create" className="button">Első termék létrehozása</Link>
                </section>
            ) : (
                <section className="dashboard-card"><div className="seller-product-table">
                    {products.map((product) => {
                        const image = product.images?.find((item) => item.is_primary) || product.images?.[0];
                        const labels = [
                            product.condition === 'new' ? 'Új' : product.condition === 'used' ? 'Használt' : null,
                            product.listing_type === 'wanted' ? 'Keres' : 'Kínál',
                            product.shipping_available ? 'Csomagküldés' : null,
                            product.personal_pickup ? 'Személyes átvétel' : null,
                            product.contains_ai ? 'MI tartalom' : null,
                            product.store?.is_trusted_seller ? 'Megbízható eladó' : null,
                        ].filter(Boolean);
                        return (
                            <article key={product.id} className="seller-product-item">
                                <div className="seller-product-item__image">
                                    {image ? <img src={image.url} alt={product.name} /> : <span>Nincs kép</span>}
                                </div>
                                <div className="seller-product-item__main">
                                    <h3>{product.name}</h3><p>{product.description}</p>
                                    <p>{[product.brand, product.model].filter(Boolean).join(' · ')}</p>
                                    <p>{[product.county, product.settlement].filter(Boolean).join(' · ')}</p>
                                    <p>{labels.join(' · ')}</p>
                                    {product.has_warranty && product.warranty_expires_at && (
                                        <p>Garancia lejárata: {product.warranty_expires_at}</p>
                                    )}
                                </div>
                                <div className="seller-product-item__price">{Number(product.price).toLocaleString('hu-HU')} Ft</div>
                                <div className="seller-product-item__stock">{product.stock} db</div>
                                <div className="seller-product-item__status">
                                   <span>{product.is_active ? 'Aktív' : 'Inaktív'}</span>
                                   <SellerProductStatus key={product.id} product={product} disabled={deletingId !== null}
                                       onChange={(updated) => setProducts((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item))} />
                               </div>
                                <div className="seller-product-item__actions">
                                    <Link to={`/seller/products/${product.id}/edit`} className="seller-button">Szerkesztés</Link>
                                    <button type="button" className="danger-button" disabled={deletingId !== null} onClick={() => handleDelete(product)}>
                                        {deletingId === product.id ? 'Törlés...' : 'Törlés'}
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div></section>
            )}
            {pagination && Number(pagination.last_page) > 1 && (
                <nav className="home-pagination" aria-label="Termékoldalak">
                    <button type="button" disabled={page <= 1 || deletingId !== null} onClick={() => setPage((current) => current - 1)}>← Előző</button>
                    <span>{page} / {pagination.last_page}</span>
                    <button type="button" disabled={page >= Number(pagination.last_page) || deletingId !== null} onClick={() => setPage((current) => current + 1)}>Következő →</button>
                </nav>
            )}
        </div>
    );
}

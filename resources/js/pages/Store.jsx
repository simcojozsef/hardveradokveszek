import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { getStore } from '../api/stores';
import ProductCard from '../components/ProductCard';
import StoreRating from '../components/StoreRating';
import { trackEvent } from '../api/analytics';

export default function Store() {
    const { slug } = useParams();
    const [store, setStore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        setStore(null);
        async function loadStore() {
            try {
                const response = await getStore(slug);
                if (!cancelled) setStore(response.data);
            } catch (err) {
                if (!cancelled) setError(err.message || 'Az üzlet nem tölthető be.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        loadStore();
        return () => { cancelled = true; };
    }, [slug]);

    useEffect(() => {
        if (!store?.id) return;
        Promise.resolve(trackEvent({
            event: 'store_view', subjectType: 'store', subjectId: store.id,
            pageUrl: `/store/${store.slug}`,
        })).catch(() => {});
    }, [store?.id, store?.slug]);

    if (loading) return <main className="page">Betöltés...</main>;
    if (error) return <main className="page"><h1>Hiba</h1><p>{error}</p></main>;
    if (!store) return <main className="page"><h1>Az üzlet nem található.</h1></main>;
    const products = store.products ?? [];

    return (
        <main className="page store-page">
            <header className="store-page__header">
                {store.logo && <img src={store.logo} alt={store.name} className="store-page__logo" />}
                <div>
                    <h1>{store.name}</h1>
                    <p>{store.description}</p>
                    <StoreRating slug={store.slug} editable />
                </div>
            </header>
            <section>
                <div className="section-heading">
                    <h2>Termékek</h2><span>{products.length} termék</span>
                </div>
                {products.length === 0 ? <p>Nincs még termék ebben az üzletben.</p> : (
                    <div className="product-grid">
                        {products.map((product) => <ProductCard key={product.id} product={product} />)}
                    </div>
                )}
            </section>
        </main>
    );
}

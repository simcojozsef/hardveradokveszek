import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getProduct } from '../api/products';
import ProductGallery from '../components/ProductGallery';
import { trackEvent } from '../api/analytics';
import StoreChatButton from '../components/StoreChatButton';
import '../../css/product-details.css';

const CONDITION_LABELS = { new: 'Új', used: 'Használt' };
const LISTING_LABELS = { offer: 'Kínál', wanted: 'Keres' };
const SHIPPING_LABELS = {
    foxpost: 'Foxpost',
    gls: 'GLS',
    magyar_posta: 'Magyar Posta',
    other: 'Egyéb',
};

function booleanValue(value) {
    if (value === true || value === 1 || value === '1') return true;
    if (value === false || value === 0 || value === '0') return false;
    return null;
}

function yesNo(value, positive = 'Igen', negative = 'Nem') {
    const boolean = booleanValue(value);
    return boolean === null ? 'Nincs megadva' : boolean ? positive : negative;
}

function textValue(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : 'Nincs megadva';
}

function formatDate(value) {
    if (typeof value !== 'string') return 'Nincs megadva';
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(value);
    if (!match) return 'Nincs megadva';
    return `${match[1]}. ${match[2]}. ${match[3]}.`;
}

export default function Product() {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        setProduct(null);

        async function loadProduct() {
            try {
                const response = await getProduct(id);
                if (!cancelled) setProduct(response.data);
            } catch (err) {
                if (!cancelled) setError(err.message || 'Nem sikerült betölteni a terméket.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadProduct();
        return () => { cancelled = true; };
    }, [id]);

    useEffect(() => {
        if (!product?.id) return;
        trackEvent({
            event: 'product_view',
            subjectType: 'product',
            subjectId: product.id,
            pageUrl: `/product/${product.id}`,
        });
    }, [product?.id]);

    if (loading) return <main className="page">Betöltés...</main>;
    if (error) {
        return <main className="page"><h1>Hiba</h1><p role="alert">{error}</p></main>;
    }
    if (!product) return <main className="page"><h1>A termék nem található.</h1></main>;

    const contactPhone = product.store?.contact_phone?.trim();
    const contactEmail = product.store?.contact_email?.trim();
    const phoneHref = contactPhone?.replace(/[^\d+]/g, '');
    const hasShipping = booleanValue(product.shipping_available) === true;
    const hasWarranty = booleanValue(product.has_warranty) === true;
    const trustedSeller = booleanValue(product.store?.is_trusted_seller) === true;
    const shippingMethods = Array.isArray(product.shipping_methods)
        ? [...new Set(product.shipping_methods)].filter((method) => typeof method === 'string')
            .map((method) => SHIPPING_LABELS[method] ?? method).join(', ')
        : '';
    const details = [
        ['condition', 'Állapot', CONDITION_LABELS[product.condition] ?? 'Nincs megadva'],
        ['listing_type', 'Hirdetés típusa', LISTING_LABELS[product.listing_type] ?? 'Nincs megadva'],
        ['brand', 'Márka', textValue(product.brand)],
        ['model', 'Modell', textValue(product.model)],
        ['county', 'Megye', textValue(product.county)],
        ['settlement', 'Település', textValue(product.settlement)],
        ['shipping_available', 'Csomagküldés', yesNo(product.shipping_available, 'Elérhető', 'Nem elérhető')],
        ...(hasShipping ? [['shipping_methods', 'Csomagküldés módja', shippingMethods || 'Nincs megadva']] : []),
        ['personal_pickup', 'Személyes átvétel', yesNo(product.personal_pickup, 'Elérhető', 'Nem elérhető')],
        ['has_warranty', 'Garancia', hasWarranty
            ? `Lejárat: ${formatDate(product.warranty_expires_at)}`
            : yesNo(product.has_warranty, 'Van', 'Nincs')],
        ['contains_ai', 'MI tartalom', yesNo(product.contains_ai, 'Tartalmaz', 'Nem tartalmaz')],
    ];

    return (
        <main className="page product-page">
            <div className="product-page__back">
                <Link to={`/store/${product.store?.slug ?? ''}`}>← Üzlet</Link>
            </div>

            <div className="product-page__layout">
                <ProductGallery images={product.images} productName={product.name} />

                <section className="product-page__info">
                    <h1>{product.name}</h1>
                    <p className="product-page__description">{product.description}</p>
                    <div className="product-page__price">
                        {Number(product.price).toLocaleString('hu-HU')} Ft
                    </div>
                    <div className="product-page__stock">
                        {product.stock > 0 ? `${product.stock} db készleten` : 'Elfogyott'}
                    </div>

                    <section className="product-page__details" aria-labelledby="product-details-heading">
                        <h2 id="product-details-heading">Termékadatok</h2>
                        <dl className="product-page__details-grid">
                            {details.map(([key, label, value]) => (
                                <div key={key} className="product-page__detail">
                                    <dt>{label}</dt>
                                    <dd>{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>

                    {product.store && (
                        <section className="product-page__contact" aria-labelledby="product-contact-heading">
                            <p className="product-page__contact-label" id="product-contact-heading">Eladó</p>
                            {trustedSeller && (
                                <span className="product-page__trusted-seller">Megbízható eladó</span>
                            )}
                            <Link className="product-page__contact-store" to={`/store/${product.store.slug}`}>
                                <span className="product-page__contact-logo">
                                    {product.store.logo ? (
                                        <img src={product.store.logo} alt="" loading="lazy" />
                                    ) : (
                                        <span aria-hidden="true">{product.store.name?.charAt(0) || 'Ü'}</span>
                                    )}
                                </span>
                                <span className="product-page__contact-store-text">
                                    <strong>{product.store.name}</strong>
                                    <small>Üzlet megtekintése →</small>
                                </span>
                            </Link>
                            {(contactPhone || contactEmail) && (
                                <div className="product-page__contact-links">
                                    {contactPhone && (
                                        <a href={`tel:${phoneHref}`}>
                                            <span>Telefon</span><strong>{contactPhone}</strong>
                                        </a>
                                    )}
                                    {contactEmail && (
                                        <a href={`mailto:${contactEmail}`}>
                                            <span>E-mail</span><strong>{contactEmail}</strong>
                                        </a>
                                    )}
                                </div>
                            )}
                            <StoreChatButton store={product.store} product={product} />
                        </section>
                    )}
                </section>
            </div>
        </main>
    );
}

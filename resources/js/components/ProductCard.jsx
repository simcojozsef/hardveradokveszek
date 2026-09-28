import React from 'react';
import { Link } from 'react-router';

export default function ProductCard({ product }) {
    const primaryImage =
        product.images?.find((image) => image.is_primary) ||
        product.images?.[0];

    return (
        <article className="product-card">
            <Link to={`/product/${product.id}`}>
                <div className="product-card__image">
                    {primaryImage ? (
                        <img
                            src={primaryImage.url}
                            alt={product.name}
                        />
                    ) : (
                        <div className="product-card__placeholder">
                            Nincs kép
                        </div>
                    )}
                </div>

                <div className="product-card__content">
                    <h3>{product.name}</h3>

                    <p className="product-card__description">
                        {product.description}
                    </p>

                    <div className="product-card__bottom">
                        <strong>
                            {Number(product.price).toLocaleString('hu-HU')} Ft
                        </strong>

                        <span>
                            {product.stock > 0
                                ? `${product.stock} db készleten`
                                : 'Elfogyott'}
                        </span>
                    </div>
                </div>
            </Link>
        </article>
    );
}
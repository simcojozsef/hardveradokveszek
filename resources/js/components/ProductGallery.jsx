import React, { useEffect, useState } from 'react';

export default function ProductGallery({ images = [], productName }) {
    const sortedImages = [...images].sort(
        (a, b) => a.sort_order - b.sort_order
    );

    const firstImage =
        sortedImages.find((image) => image.is_primary) ||
        sortedImages[0] ||
        null;

    const [selectedImage, setSelectedImage] = useState(firstImage);

    useEffect(() => {
        setSelectedImage(
            sortedImages.find((image) => image.is_primary) ||
            sortedImages[0] ||
            null
        );
    }, [images]);

    if (!sortedImages.length) {
        return (
            <div className="product-gallery__empty">
                Nincs kép
            </div>
        );
    }

    return (
        <div className="product-gallery">
            <div className="product-gallery__main">
                <img
                    src={selectedImage.url}
                    alt={productName}
                />
            </div>

            <div className="product-gallery__thumbs">
                {sortedImages.map((image) => (
                    <button
                        key={image.id}
                        type="button"
                        onClick={() => setSelectedImage(image)}
                        className={
                            selectedImage?.id === image.id
                                ? 'is-selected'
                                : ''
                        }
                    >
                        <img
                            src={image.url}
                            alt=""
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}
import React, { useEffect, useState } from 'react';

import {
    getMyMedia,
    uploadMedia,
    deleteMedia,
} from '../api/import';
import { useToast } from '../context/ToastContext';

/*
 * The seller's media library.
 *
 * Images live here and the import spreadsheet refers to them by filename, so a
 * name in a sheet resolves to a file the seller actually uploaded rather than
 * an arbitrary path.
 */
export default function MediaLibrary() {
    const toast = useToast();

    const [media, setMedia] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [copiedName, setCopiedName] = useState(null);

    async function load() {
        setLoading(true);

        try {
            const response = await getMyMedia();
            setMedia(response.data ?? []);
        } catch (err) {
            toast.error(err.message || 'A media tár nem tölthető be.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function handleUpload(event) {
        const files = Array.from(event.target.files ?? []);

        if (files.length === 0) return;

        setUploading(true);

        try {
            const response = await uploadMedia(files);
            toast.success(response.message || 'Fájlok feltöltve.');
            await load();
        } catch (err) {
            toast.error(err.message || 'A feltöltés nem sikerült.');
        } finally {
            setUploading(false);
            // Allow re-selecting the same file after a failure.
            event.target.value = '';
        }
    }

    async function handleDelete(item) {
        setDeletingId(item.id);

        try {
            await deleteMedia(item.id);
            setMedia((current) => current.filter((m) => m.id !== item.id));
            toast.success('Fájl törölve.');
        } catch (err) {
            toast.error(err.message || 'A törlés nem sikerült.');
        } finally {
            setDeletingId(null);
        }
    }

    async function copyName(name) {
        try {
            await navigator.clipboard.writeText(name);
            setCopiedName(name);
            toast.success(`Vágólapra másolva: ${name}`);
            window.setTimeout(() => setCopiedName(null), 2000);
        } catch {
            toast.error('A másolás nem sikerült.');
        }
    }

    return (
        <section className="dashboard-card import-card">
            <h2>2. Media elemek feltöltése</h2>
            <p className="import-card__hint">
                Töltsd fel a termékfotókat ide. A fájlnevekre hivatkozol majd a
                sablonban: a <strong>kiemelt_kep</strong> egy fájlnév, a{' '}
                <strong>galeria_kepek</strong> pedig vesszővel elválasztott
                fájlnevek. JPG, JPEG és PNG támogatott, fájlonként legfeljebb 5 MB.
            </p>

            <label className="media-upload">
                <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleUpload}
                    disabled={uploading}
                />
                <span>{uploading ? 'Feltöltés...' : 'Fájlok kiválasztása'}</span>
            </label>

            {loading && <p className="import-card__hint">Media tár betöltése...</p>}

            {!loading && media.length === 0 && (
                <p className="import-card__hint">
                    Még nincs feltöltött kép. Kezdd a fájlok kiválasztásával.
                </p>
            )}

            {!loading && media.length > 0 && (
                <ul className="media-grid">
                    {media.map((item) => (
                        <li key={item.id} className="media-item">
                            <div className="media-item__preview">
                                <img src={item.url} alt={item.name} loading="lazy" />
                            </div>

                            <button
                                type="button"
                                className="media-item__name"
                                onClick={() => copyName(item.name)}
                                title="Fájlnév másolása"
                            >
                                {copiedName === item.name ? '✓ Másolva' : item.name}
                            </button>

                            <button
                                type="button"
                                className="danger-button media-item__delete"
                                disabled={deletingId !== null}
                                onClick={() => handleDelete(item)}
                            >
                                {deletingId === item.id ? '...' : 'Törlés'}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

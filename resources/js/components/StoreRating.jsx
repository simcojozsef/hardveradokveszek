import React, { useEffect, useRef, useState } from 'react';
import { getStoreRatings, getMyStoreRating, getRatingViewer, rateStore } from '../api/storeRatings';

export default function StoreRating(props) {
    // Changing stores resets votes and discards requests from the previous store.
    return <StoreRatingContent key={props.slug} {...props} />;
}

function StoreRatingContent({ slug, editable = false }) {
    const [rating, setRating] = useState(null);
    const [viewer, setViewer] = useState(undefined);
    const [ready, setReady] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const requests = useRef(null);
    const busy = useRef(false);

    useEffect(() => {
        const controller = new AbortController();
        requests.current = controller;
        setReady(false);
        setError('');

        async function load() {
            try {
                const summary = await getStoreRatings(slug, controller.signal);
                if (controller.signal.aborted) return;
                setRating(summary);

                if (editable) {
                    const user = await getRatingViewer(controller.signal);
                    if (controller.signal.aborted) return;
                    setViewer(user);
                    if (user?.role === 'buyer') {
                        const own = await getMyStoreRating(slug, controller.signal);
                        if (controller.signal.aborted) return;
                        setRating(own);
                    }
                }
                setReady(true);
            } catch (err) {
                if (!controller.signal.aborted) setError('Az értékelés nem tölthető be.');
            }
        }

        load();
        return () => controller.abort();
    }, [slug, editable]);

    async function vote(value) {
        if (!ready || viewer?.role !== 'buyer' || busy.current || rating?.user_vote === value) return;
        const controller = requests.current;
        if (!controller || controller.signal.aborted) return;
        busy.current = true;
        setSaving(true);
        setError('');
        try {
            const result = await rateStore(slug, value, controller.signal);
            if (!controller.signal.aborted) setRating(result);
        } catch (err) {
            if (!controller.signal.aborted) {
                setError(err.status === 401 || err.status === 419
                    ? 'A munkamenet lejárt. Jelentkezz be újra.'
                    : err.status === 403
                        ? 'Csak vásárlói fiókkal értékelhetsz.'
                        : err.status === 429
                            ? 'Túl sok kérés. Próbáld újra egy perc múlva.'
                            : 'Az értékelés mentése nem sikerült. Próbáld újra.');
            }
        } finally {
            busy.current = false;
            if (!controller.signal.aborted) setSaving(false);
        }
    }

    const canVote = editable && ready && viewer?.role === 'buyer';
    if (!rating) {
        return (
            <div className="store-rating">
                <p
                    className={
                        error
                            ? 'store-rating__error'
                            : 'store-rating__hint'
                    }
                    role={error ? 'alert' : 'status'}
                >
                    {error || 'Nincsenek még értékelések a boltról.'}
                </p>
            </div>
        );
    }
    const positive = rating?.positive_ratings_count;
    const negative = rating?.negative_ratings_count;

    return (
        <div className={`store-rating${editable ? '' : ' store-rating--compact'}`}>
            <div className="store-rating__row" aria-label="Üzlet értékelése">
                {editable && <span className="store-rating__label">Értékelés:</span>}
                {canVote ? (
                    <>
                        <button type="button" className="store-rating__score store-rating__score--positive"
                            aria-label={`Pozitív értékelés: ${positive}`}
                            aria-pressed={rating?.user_vote === 1}
                            disabled={saving || rating?.user_vote === 1} onClick={() => vote(1)}>
                            +{positive}
                        </button>
                        <button type="button" className="store-rating__score store-rating__score--negative"
                            aria-label={`Negatív értékelés: ${negative}`}
                            aria-pressed={rating?.user_vote === -1}
                            disabled={saving || rating?.user_vote === -1} onClick={() => vote(-1)}>
                            −{negative}
                        </button>
                    </>
                ) : (
                    <>
                        <span className="store-rating__score store-rating__score--positive"
                            aria-label={rating ? `${positive} pozitív értékelés` : 'Értékelés betöltése'}>
                            {rating ? `+${positive}` : '…'}
                        </span>
                        <span className="store-rating__score store-rating__score--negative"
                            aria-label={rating ? `${negative} negatív értékelés` : 'Értékelés betöltése'}>
                            {rating ? `−${negative}` : '…'}
                        </span>
                    </>
                )}
            </div>
            {editable && ready && (
                <p className="store-rating__hint" role="status">
                    {saving ? 'Mentés…' : viewer?.role === 'buyer'
                        ? rating?.user_vote == null
                            ? 'Értékeld az üzletet a + vagy − gombbal.'
                            : 'Értékelésed mentve. A másik gombbal módosíthatod.'
                        : !viewer
                            ? 'Az értékeléshez jelentkezz be vásárlói fiókkal.'
                            : 'Csak vásárlói fiókkal értékelhetsz.'}
                </p>
            )}
            {error && <p className="store-rating__error" role="alert">{error}</p>}
        </div>
    );
}

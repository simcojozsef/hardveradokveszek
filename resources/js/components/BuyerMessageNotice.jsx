import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getBuyerChats } from '../api/chat';

export default function BuyerMessageNotice() {
    const [notice, setNotice] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function refresh() {
            try {
                const response = await getBuyerChats();
                const conversations = response.data.conversations ?? [];
                const unread = conversations.find(
                    (conversation) => Number(conversation.unread_count) > 0
                );
                if (!cancelled) setNotice(unread ?? null);
            } catch {
                // Keep the last notice visible during a brief network issue.
            }
        }

        refresh();
        const timer = window.setInterval(refresh, 10000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, []);

    if (!notice) return null;

    return (
        <section className="seller-message-notice buyer-message-notice" role="status">
            <div className="seller-message-notice__icon" aria-hidden="true">✉</div>
            <div className="seller-message-notice__content">
                <p>
                    Önnek egy új üzenete érkezett{' '}
                    <strong>{notice.store.name}</strong>-től.
                </p>
                {notice.product?.name && (
                    <small>Termék: {notice.product.name}</small>
                )}
            </div>
            <Link
                to={`/buyer/messages?conversation=${notice.id}`}
                className="seller-message-notice__button"
            >
                Üzenet megnyitása
            </Link>
        </section>
    );
}

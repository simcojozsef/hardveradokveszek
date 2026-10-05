import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getSellerChats } from '../api/chat';

export default function SellerMessageNotice() {
    const [notice, setNotice] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function refresh() {
            try {
                const response = await getSellerChats();
                const conversations = response.data.conversations ?? [];
                const unread = conversations.find(
                    (conversation) => Number(conversation.unread_count) > 0
                );
                if (!cancelled) setNotice(unread ?? null);
            } catch {
                // A temporary network issue shouldn't remove the last notice.
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
        <section className="seller-message-notice" role="status">
            <div className="seller-message-notice__icon" aria-hidden="true">✉</div>
            <div className="seller-message-notice__content">
                <p>
                    Önnek egy új üzenete érkezett{' '}
                    <strong>{notice.buyer.name}</strong>-től.
                </p>
                {notice.product?.name && (
                    <small>Termék: {notice.product.name}</small>
                )}
            </div>
            <Link
                to={`/seller/chats?conversation=${notice.id}`}
                className="seller-message-notice__button"
            >
                Üzenet megnyitása
            </Link>
        </section>
    );
}

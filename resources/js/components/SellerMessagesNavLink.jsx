import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router';
import { getSellerChats } from '../api/chat';

export default function SellerMessagesNavLink() {
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function refreshUnread() {
            try {
                const response = await getSellerChats();
                const conversations = response.data.conversations ?? [];
                const count = conversations.reduce(
                    (total, conversation) => total + Number(conversation.unread_count || 0),
                    0
                );
                if (!cancelled) setUnread(count);
            } catch {
                // Keep the last known badge if the request temporarily fails.
            }
        }

        refreshUnread();
        const timer = window.setInterval(refreshUnread, 10000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, []);

    return (
        <NavLink to="/seller/chats" className="seller-messages-link">
            <span>Üzenetek</span>
            {unread > 0 && (
                <span className="seller-messages-link__badge" aria-label={`${unread} olvasatlan üzenet`}>
                    {unread > 99 ? '99+' : unread}
                </span>
            )}
        </NavLink>
    );
}

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { getSellerChats } from '../../api/chat';
import ChatWindow from '../../components/ChatWindow';

export default function SellerChats() {
    const [conversations, setConversations] = useState([]);
    const [selected, setSelected] = useState(null);
    const [viewerId, setViewerId] = useState(null);
    const [error, setError] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const response = await getSellerChats();
                if (!cancelled) {
                    setConversations(response.data.conversations ?? []);
                    setViewerId(response.data.viewer_id ?? null);
                    setError('');
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || 'A beszélgetések nem tölthetők be.');
                }
            }
        }

        load();
        const timer = window.setInterval(load, 10000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, []);

    useEffect(() => {
        const conversationId = searchParams.get('conversation');
        if (!conversationId || conversations.length === 0) return;

        const match = conversations.find(
            (conversation) => String(conversation.id) === conversationId
        );
        if (!match) return;

        setSelected(match);
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.delete('conversation');
            return next;
        }, { replace: true });
    }, [conversations, searchParams, setSearchParams]);

    return (
        <main className="seller-page seller-chats">
            <div className="seller-page__header">
                <div>
                    <p className="eyebrow">Üzlet</p>
                    <h1>Üzenetek</h1>
                </div>
            </div>

            {error && <p role="alert">{error}</p>}
            {!error && conversations.length === 0 && <p>Még nincs beszélgetés.</p>}

            <div className="seller-chats__list">
                {conversations.map((conversation) => (
                    <button
                        key={conversation.id}
                        type="button"
                        className={`seller-chats__conversation${conversation.unread_count ? ' has-unread' : ''}`}
                        onClick={() => setSelected(conversation)}
                    >
                        <span className="seller-chats__conversation-main">
                            <strong>{conversation.buyer.name}</strong>
                            <span className="seller-chats__preview">
                                {conversation.last_message?.body ?? 'Beszélgetés megnyitása'}
                            </span>
                        </span>
                        <span className="seller-chats__conversation-meta">
                            {conversation.last_message?.created_at && (
                                <time dateTime={conversation.last_message.created_at}>
                                    {new Date(conversation.last_message.created_at).toLocaleTimeString('hu-HU', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </time>
                            )}
                            {conversation.unread_count > 0 && (
                                <span className="seller-chats__unread" aria-label={`${conversation.unread_count} olvasatlan üzenet`}>
                                    {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                                </span>
                            )}
                        </span>
                    </button>
                ))}
            </div>

            {selected && (
                <ChatWindow
                    key={selected.id}
                    title={selected.buyer.name}
                    conversationId={selected.id}
                    viewerId={viewerId}
                    product={selected.product}
                    onClose={() => setSelected(null)}
                />
            )}
        </main>
    );
}

import React, { useState } from 'react';
import { getChatSession, startStoreChat } from '../api/chat';
import ChatWindow from './ChatWindow';

export default function StoreChatButton({ store, product }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [guest, setGuest] = useState(false);
    const [conversation, setConversation] = useState(null);
    const [error, setError] = useState('');

    async function handleOpen() {
        setOpen(true);
        if (conversation || loading) return;
        setLoading(true);
        setError('');
        try {
            const session = await getChatSession();
            if (!session.data.authenticated) {
                setGuest(true);
                return;
            }
            const response = await startStoreChat(store.id, product.id);
            setGuest(false);
            setConversation(response.data);
        } catch (err) {
            setError(err.message || 'A chat most nem érhető el.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <button type="button" className="product-page__chat-button" onClick={handleOpen}>
                Chat az eladóval
            </button>
            {open && (
                loading ? (
                    <div className="store-chat-window store-chat-window--loading" role="status">
                        Chat megnyitása...
                    </div>
                ) : error ? (
                    <div className="store-chat-window store-chat-window--loading" role="alert">
                        <button type="button" onClick={() => setOpen(false)} aria-label="Bezárás">×</button>
                        <p>{error}</p>
                        <button type="button" onClick={handleOpen}>Újrapróbálás</button>
                    </div>
                ) : (
                    <ChatWindow
                        title={store.name}
                        guest={guest}
                        conversationId={conversation?.id}
                        viewerId={conversation?.viewer_id}
                        product={conversation?.product ?? product}
                        onClose={() => setOpen(false)}
                    />
                )
            )}
        </>
    );
}

import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { getChatMessages, sendChatMessage } from '../api/chat';

export default function ChatWindow({ conversationId, title, viewerId, product: initialProduct = null, guest = false, onClose }) {
    const [messages, setMessages] = useState([]);
    const [product, setProduct] = useState(initialProduct);
    const [draft, setDraft] = useState('');
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        if (!conversationId) return undefined;
        let cancelled = false;

        async function refresh() {
            try {
                const response = await getChatMessages(conversationId);
                if (!cancelled) {
                    setMessages(response.data.messages);
                    setProduct(response.data.product ?? initialProduct);
                    setError('');
                }
            } catch (err) {
                if (!cancelled) setError(err.message || 'Az üzenetek nem tölthetők be.');
            }
        }

        setMessages([]);
        refresh();
        const timer = window.setInterval(refresh, 3000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [conversationId, initialProduct]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ block: 'end' });
    }, [messages.length]);

    async function handleSend(event) {
        event.preventDefault();
        const body = draft.trim();
        if (!body || !conversationId || sending) return;

        setSending(true);
        setError('');
        try {
            const response = await sendChatMessage(conversationId, body);
            setMessages((current) => current.some((message) => message.id === response.data.id)
                ? current : [...current, response.data]);
            setDraft('');
        } catch (err) {
            setError(err.message || 'Az üzenet nem küldhető el.');
        } finally {
            setSending(false);
        }
    }

    return (
        <section className="store-chat-window" role="dialog" aria-modal="false" aria-label={`Chat: ${title}`}>
            <header className="store-chat-window__header">
                <strong>{title}</strong>
                <button type="button" onClick={onClose} aria-label="Chat bezárása">×</button>
            </header>

            {product && (
                <a
                    className="store-chat-window__products"
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${product.name} megnyitása új lapon`}
                >
                    <span className="store-chat-window__product-image">
                        {product.image ? (
                            <img src={product.image} alt="" />
                        ) : (
                            <span aria-hidden="true">Termék</span>
                        )}
                    </span>
                    <span className="store-chat-window__product-copy">
                        <small>Termék a beszélgetésben</small>
                        <strong>{product.name}</strong>
                    </span>
                    <span className="store-chat-window__product-arrow" aria-hidden="true">↗</span>
                </a>
            )}

            {guest ? (
                <div className="store-chat-window__guest">
                    <p>Az online chat használatához regisztráljon, vagy lépjen be.</p>
                    <Link to="/login" onClick={onClose}>Belépés / regisztráció</Link>
                </div>
            ) : (
                <>
                    <div className="store-chat-window__messages" aria-live="polite" aria-relevant="additions text">
                        {messages.length === 0 && !error && (
                            <p className="store-chat-window__empty">Írj egy üzenetet az eladónak.</p>
                        )}
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`store-chat-window__message${Number(message.sender_id) === Number(viewerId) ? ' is-own' : ''}`}
                            >
                                <p>{message.body}</p>
                                <time dateTime={message.created_at}>
                                    {new Date(message.created_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
                                </time>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>
                    {error && <p className="store-chat-window__error" role="alert">{error}</p>}
                    <form className="store-chat-window__composer" onSubmit={handleSend}>
                        <input
                            type="text"
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            maxLength={2000}
                            placeholder="Írj üzenetet..."
                            aria-label="Üzenet"
                        />
                        <button type="submit" disabled={!draft.trim() || sending}>
                            Küldés
                        </button>
                    </form>
                </>
            )}
        </section>
    );
}

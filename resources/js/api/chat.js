import { apiFetch } from './client';

export function getChatSession() {
    return apiFetch('/chat/session');
}

export function startStoreChat(storeId, productId) {
    return apiFetch(`/chat/stores/${storeId}/conversation`, {
        method: 'POST',
        body: JSON.stringify({ product_id: productId }),
    });
}

export function getChatMessages(conversationId) {
    return apiFetch(`/chat/conversations/${conversationId}/messages`);
}

export function sendChatMessage(conversationId, body) {
    return apiFetch(`/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body }),
    });
}

export function getSellerChats() {
    return apiFetch('/chat/my-store/conversations');
}

export function getBuyerChats() {
    return apiFetch('/chat/my-conversations');
}
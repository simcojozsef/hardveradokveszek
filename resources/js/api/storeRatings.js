// Same-origin Sanctum session authentication (your app is served at :8000).
// If your existing API client uses a different base URL or bearer tokens,
// adapt only this file to that client; component/backend code stays the same.
async function request(path, options = {}) {
    const response = await fetch(path, {
        credentials: 'include',
        ...options,
        headers: { Accept: 'application/json', ...options.headers },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
        const error = new Error(body?.message || 'Az értékelés nem érhető el.');
        error.status = response.status;
        throw error;
    }
    return body;
}

const storePath = (slug) => `/api/stores/${encodeURIComponent(slug)}`;

export function getStoreRatings(slug, signal) {
    return request(`${storePath(slug)}/ratings`, { signal });
}

export function getMyStoreRating(slug, signal) {
    return request(`${storePath(slug)}/my-rating`, { signal });
}

export async function getRatingViewer(signal) {
    try {
        const body = await request('/api/me', { signal });
        return body?.user ?? body?.data ?? body;
    } catch (error) {
        if (error.status === 401) return null;
        throw error;
    }
}

export async function rateStore(slug, value, signal) {
    await request('/sanctum/csrf-cookie', { signal });
    const cookie = document.cookie.split('; ').find((item) => item.startsWith('XSRF-TOKEN='));
    const token = cookie ? decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) : null;
    if (!token) throw new Error('A munkamenet lejárt. Jelentkezz be újra.');

    return request(`${storePath(slug)}/rating`, {
        method: 'PUT', signal,
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': token },
        body: JSON.stringify({ value }),
    });
}

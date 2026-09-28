const API_URL = '/api';

function getCookie(name) {
    const cookies = document.cookie.split(';');

    for (const cookie of cookies) {
        const [key, ...valueParts] = cookie.trim().split('=');

        if (key === name) {
            return decodeURIComponent(valueParts.join('='));
        }
    }

    return null;
}

export async function getCsrfCookie() {
    const response = await fetch('/sanctum/csrf-cookie', {
        credentials: 'include',
        headers: {
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Unable to initialize CSRF protection.');
    }
}

export async function apiFetch(endpoint, options = {}) {
    const method = (options.method || 'GET').toUpperCase();

    const headers = {
        Accept: 'application/json',
        ...(options.headers || {}),
    };

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        const csrfToken = getCookie('XSRF-TOKEN');

        if (csrfToken) {
            headers['X-XSRF-TOKEN'] = csrfToken;
        }
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        method,
        headers,
        credentials: 'include',
    });

    const contentType = response.headers.get('content-type');

    let data = null;

    if (contentType?.includes('application/json')) {
        data = await response.json();
    }

    if (!response.ok) {
        const error = new Error(
            data?.message || 'API request failed.'
        );

        error.status = response.status;
        error.errors = data?.errors || null;

        throw error;
    }

    return data;
}
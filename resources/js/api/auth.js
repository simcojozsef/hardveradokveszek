import {
    apiFetch,
    getCsrfCookie,
} from './client';

export async function registerUser(data) {
    await getCsrfCookie();

    return apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function loginUser(data) {
    await getCsrfCookie();

    return apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function logoutUser() {
    return apiFetch('/auth/logout', {
        method: 'POST',
    });
}

export async function getCurrentUser() {
    return apiFetch('/me');
}
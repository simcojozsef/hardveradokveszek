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

/*
 * Registration now finishes with an emailed code, and login has a second
 * factor. Both are plain API calls; only the Google flow leaves the SPA.
 */
export async function verifyEmailCode(data) {
    await getCsrfCookie();

    return apiFetch('/auth/email/verify', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function resendVerificationCode(email) {
    await getCsrfCookie();

    return apiFetch('/auth/email/resend', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
}

export async function submitTwoFactorCode(code, twoFactorToken) {
    await getCsrfCookie();

    return apiFetch('/auth/two-factor/challenge', {
        method: 'POST',
        body: JSON.stringify({
            code,
            two_factor_token: twoFactorToken,
        }),
    });
}

export async function resendTwoFactorCode(twoFactorToken) {
    await getCsrfCookie();

    return apiFetch('/auth/two-factor/resend', {
        method: 'POST',
        body: JSON.stringify({
            two_factor_token: twoFactorToken,
        }),
    });
}
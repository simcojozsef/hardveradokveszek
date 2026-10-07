import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    getCurrentUser,
    loginUser,
    logoutUser,
    registerUser,
    verifyEmailCode,
    resendVerificationCode,
    submitTwoFactorCode,
    resendTwoFactorCode,
} from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    async function loadUser() {
        try {
            const response = await getCurrentUser();
            setUser(response.data);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadUser();
    }, []);

    async function login(credentials) {
        const response = await loginUser(credentials);
        setUser(response.user);

        return response;
    }

    async function register(data) {
        const response = await registerUser(data);
        setUser(response.user);

        return response;
    }

    async function logout() {
        await logoutUser();
        setUser(null);
    }

    /*
     * Email verification (after register) and the second factor (after login)
     * both end the same way: the server grants the session, so we simply load
     * the user back in.
     */
    async function verifyEmail(data) {
        const response = await verifyEmailCode(data);
        setUser(response.user);

        return response;
    }

    async function completeTwoFactor(code, twoFactorToken) {
        const response = await submitTwoFactorCode(code, twoFactorToken);
        setUser(response.user);

        return response;
    }

    const value = useMemo(
        () => ({
            user,
            loading,
            login,
            register,
            logout,
            verifyEmail,
            completeTwoFactor,
            resendVerificationCode,
            resendTwoFactorCode,
            isAuthenticated: Boolean(user),
            isSeller: user?.role === 'seller',
            isBuyer: user?.role === 'buyer',
            isAdmin: user?.role === 'admin',
        }),
        [user, loading],
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            'useAuth must be used inside AuthProvider.',
        );
    }

    return context;
}
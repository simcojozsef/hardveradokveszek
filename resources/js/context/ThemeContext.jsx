import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'gigapiac.theme';

/*
 * Light is the default, so an empty storage or a missing attribute means
 * light rather than a system preference.
 */
function readStoredTheme() {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);

        return stored === 'dark' ? 'dark' : 'light';
    } catch {
        // Private mode or blocked storage: fall back to the default.
        return 'light';
    }
}

function applyTheme(theme) {
    const root = document.documentElement;

    root.dataset.theme = theme;
    // Let the browser paint form controls and scrollbars to match.
    root.style.colorScheme = theme;
}

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() =>
        typeof window === 'undefined' ? 'light' : readStoredTheme()
    );

    useEffect(() => {
        applyTheme(theme);

        try {
            window.localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            // Storage is a nicety here, not a requirement.
        }
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
    }, []);

    const value = useMemo(
        () => ({
            theme,
            isDark: theme === 'dark',
            setTheme,
            toggleTheme,
        }),
        [theme, toggleTheme],
    );

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useTheme must be used inside ThemeProvider.');
    }

    return context;
}

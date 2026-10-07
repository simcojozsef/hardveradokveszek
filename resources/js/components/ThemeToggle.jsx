import React from 'react';
import { FiMoon, FiSun } from 'react-icons/fi';

import { useTheme } from '../context/ThemeContext';

import '../../css/theme-toggle.css';

/*
 * Light/dark switch for the navbar.
 *
 * The icon shows the theme you would switch TO: a moon while light, a sun
 * while dark.
 */
export default function ThemeToggle({ className = '' }) {
    const { isDark, toggleTheme } = useTheme();

    const label = isDark
        ? 'Váltás világos módra'
        : 'Váltás sötét módra';

    return (
        <button
            type="button"
            className={`theme-toggle ${className}`.trim()}
            onClick={toggleTheme}
            aria-label={label}
            aria-pressed={isDark}
            title={label}
        >
            {isDark ? (
                <FiSun aria-hidden="true" />
            ) : (
                <FiMoon aria-hidden="true" />
            )}
        </button>
    );
}

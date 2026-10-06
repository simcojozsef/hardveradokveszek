import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiX, FiXCircle } from 'react-icons/fi';

/**
 * Toast notifications.
 *
 * `useToast()` returns helpers that push a message into the stack rendered in
 * the top-right corner. Messages are dismissible, auto-expire (errors stay a
 * little longer because they carry something to act on), and are announced to
 * assistive tech through an aria-live region.
 */

const ToastContext = createContext(null);

const VARIANTS = {
    success: { icon: FiCheckCircle, role: 'status' },
    error: { icon: FiXCircle, role: 'alert' },
    warning: { icon: FiAlertTriangle, role: 'status' },
    info: { icon: FiInfo, role: 'status' },
};

/** Errors linger; confirmations can go away quickly. Errors never auto-hide mid-read. */
const DEFAULT_DURATION = {
    success: 4000,
    info: 4000,
    warning: 6000,
    error: 7000,
};

let nextId = 0;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const timers = useRef(new Map());

    const dismiss = useCallback((id) => {
        const timer = timers.current.get(id);
        if (timer) {
            window.clearTimeout(timer);
            timers.current.delete(id);
        }
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const push = useCallback((variant, message, options = {}) => {
        if (!message) return null;

        const id = (nextId += 1);
        const type = VARIANTS[variant] ? variant : 'info';
        const duration = options.duration ?? DEFAULT_DURATION[type] ?? 4000;

        setToasts((current) => {
            // Never show the same message twice in a row.
            if (current.some((toast) => toast.message === message && toast.variant === type)) {
                return current;
            }
            // Keep the stack short so it never covers the page.
            const trimmed = current.length >= 4 ? current.slice(current.length - 3) : current;
            return [...trimmed, { id, variant: type, message, title: options.title ?? null }];
        });

        if (duration > 0) {
            timers.current.set(id, window.setTimeout(() => dismiss(id), duration));
        }

        return id;
    }, [dismiss]);

    useEffect(() => () => {
        timers.current.forEach((timer) => window.clearTimeout(timer));
        timers.current.clear();
    }, []);

    const value = useMemo(() => ({
        toasts,
        dismiss,
        toast: (message, options) => push('info', message, options),
        success: (message, options) => push('success', message, options),
        error: (message, options) => push('error', message, options),
        warning: (message, options) => push('warning', message, options),
        info: (message, options) => push('info', message, options),
    }), [toasts, dismiss, push]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastViewport toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
}

function ToastViewport({ toasts, onDismiss }) {
    if (toasts.length === 0) return null;

    return (
        <div className="toast-stack" aria-live="polite" aria-atomic="false">
            {toasts.map((toast) => {
                const { icon: Icon, role } = VARIANTS[toast.variant];
                return (
                    <div
                        key={toast.id}
                        className={`toast toast--${toast.variant}`}
                        role={role}
                    >
                        <span className="toast__icon" aria-hidden="true">
                            <Icon />
                        </span>

                        <div className="toast__content">
                            {toast.title && (
                                <strong className="toast__title">{toast.title}</strong>
                            )}
                            <span className="toast__message">{toast.message}</span>
                        </div>

                        <button
                            type="button"
                            className="toast__close"
                            onClick={() => onDismiss(toast.id)}
                            aria-label="Értesítés bezárása"
                        >
                            <FiX aria-hidden="true" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

export function useToast() {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error('useToast must be used inside ToastProvider.');
    }

    return context;
}

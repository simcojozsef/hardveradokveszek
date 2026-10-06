import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

/**
 * Promise-based confirmation dialog that replaces window.confirm().
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ message: 'Biztosan törlöd?' }))) return;
 *
 * Renders a styled modal instead of the browser's native prompt, with the
 * affirmative action labelled "Igen" and the cancel action "Nem".
 */

const ConfirmContext = createContext(null);

const DEFAULTS = {
    title: 'Biztosan szeretnéd?',
    confirmLabel: 'Igen',
    cancelLabel: 'Nem',
    tone: 'default',
};

export function ConfirmProvider({ children }) {
    const [request, setRequest] = useState(null);
    const resolver = useRef(null);

    const confirm = useCallback((options) => new Promise((resolve) => {
        resolver.current = resolve;
        setRequest({ ...DEFAULTS, ...(typeof options === 'string' ? { message: options } : options) });
    }), []);

    const close = useCallback((result) => {
        if (resolver.current) {
            resolver.current(result);
            resolver.current = null;
        }
        setRequest(null);
    }, []);

    // Escape cancels, matching the native behaviour users expect.
    useEffect(() => {
        if (!request) return undefined;
        function onKeyDown(event) {
            if (event.key === 'Escape') close(false);
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [request, close]);

    const value = useMemo(() => ({ confirm }), [confirm]);

    return (
        <ConfirmContext.Provider value={value}>
            {children}
            {request && (
                <ConfirmDialog
                    {...request}
                    onConfirm={() => close(true)}
                    onCancel={() => close(false)}
                />
            )}
        </ConfirmContext.Provider>
    );
}

function ConfirmDialog({
    title,
    message,
    detail,
    confirmLabel,
    cancelLabel,
    tone,
    onConfirm,
    onCancel,
}) {
    const confirmRef = useRef(null);

    // Focus the affirmative action so the dialog is keyboard-ready.
    useEffect(() => {
        confirmRef.current?.focus();
    }, []);

    return (
        <div
            className="confirm-overlay"
            role="presentation"
            onClick={(event) => {
                if (event.target === event.currentTarget) onCancel();
            }}
        >
            <div
                className="confirm-dialog"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby={message ? 'confirm-dialog-message' : undefined}
            >
                <h2 className="confirm-dialog__title" id="confirm-dialog-title">
                    {title}
                </h2>

                {message && (
                    <p className="confirm-dialog__message" id="confirm-dialog-message">
                        {message}
                    </p>
                )}

                {detail && (
                    <p className="confirm-dialog__detail">{detail}</p>
                )}

                <div className="confirm-dialog__actions">
                    <button
                        type="button"
                        className="confirm-dialog__cancel"
                        onClick={onCancel}
                    >
                        {cancelLabel}
                    </button>

                    <button
                        type="button"
                        ref={confirmRef}
                        className={
                            tone === 'danger'
                                ? 'confirm-dialog__confirm confirm-dialog__confirm--danger'
                                : 'confirm-dialog__confirm'
                        }
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmContext);

    if (!context) {
        throw new Error('useConfirm must be used inside ConfirmProvider.');
    }

    return context.confirm;
}

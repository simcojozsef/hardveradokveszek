import React, { useCallback, useEffect, useState } from 'react';

import { getAdminBilling, retryInvoiceTask } from '../../api/adminBilling';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

import '../../../css/admin-billing.css';

function formatHuf(value) {
    return `${Number(value || 0).toLocaleString('hu-HU')} Ft`;
}

/*
 * Admin view of the billing pipeline.
 *
 * Surfaces what the spec asks for: subscription counts, webhook failures,
 * invoices, uncertain tasks. A retry re-runs the same idempotent path, so the
 * button can never create a second document.
 */
const STATUS_LABELS = {
    pending: 'Függőben',
    processing: 'Feldolgozás alatt',
    issued: 'Kiállítva',
    failed: 'Sikertelen',
    uncertain: 'Bizonytalan',
};

export default function AdminBilling() {
    const toast = useToast();
    const confirm = useConfirm();

    const [tasks, setTasks] = useState([]);
    const [counts, setCounts] = useState({});
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [retryingId, setRetryingId] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);

        try {
            const response = await getAdminBilling(status || undefined);
            setTasks(response.data ?? []);
            setCounts(response.counts ?? {});
        } catch (err) {
            toast.error(err.message || 'A számlázási adatok nem tölthetők be.');
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => {
        load();
    }, [load]);

    async function handleRetry(task) {
        if (
            !(await confirm({
                message: 'Újrapróbálod a számla kiállítását?',
                detail: `#${task.id} · ${task.stripe_invoice_id}`,
                confirmLabel: 'Újrapróbálás',
                cancelLabel: 'Mégsem',
            }))
        ) {
            return;
        }

        setRetryingId(task.id);

        try {
            const response = await retryInvoiceTask(task.id);

            if (response.status === 'issued') {
                toast.success(`Számla kiállítva: ${response.invoice_number}`);
            } else if (response.status === 'uncertain') {
                toast.error('Bizonytalan válasz — kézi ellenőrzés szükséges.');
            } else {
                toast.error(response.error || 'A kiállítás nem sikerült.');
            }

            await load();
        } catch (err) {
            toast.error(err.message || 'Az újrapróbálás nem sikerült.');
        } finally {
            setRetryingId(null);
        }
    }

    return (
        <div className="admin-page admin-billing">
            <header className="admin-page__header">
                <div>
                    <p className="eyebrow">Adminisztráció</p>
                    <h1>Számlázás és előfizetések</h1>
                </div>

                <button type="button" className="secondary-button" onClick={load}>
                    Frissítés
                </button>
            </header>

            <section className="billing-counters">
                <div className="billing-counter">
                    <span>Élő előfizetés</span>
                    <strong>{counts.live_subscriptions ?? 0}</strong>
                </div>
                <div className="billing-counter billing-counter--warn">
                    <span>Bizonytalan számla</span>
                    <strong>{counts.uncertain ?? 0}</strong>
                </div>
                <div className="billing-counter billing-counter--bad">
                    <span>Sikertelen számla</span>
                    <strong>{counts.failed ?? 0}</strong>
                </div>
                <div className="billing-counter">
                    <span>Függő számla</span>
                    <strong>{counts.pending ?? 0}</strong>
                </div>
                <div className="billing-counter billing-counter--bad">
                    <span>Sikertelen webhook</span>
                    <strong>{counts.webhook_failed ?? 0}</strong>
                </div>
            </section>

            <div className="billing-filters">
                {['', 'uncertain', 'failed', 'pending', 'issued'].map((value) => (
                    <button
                        key={value || 'all'}
                        type="button"
                        className={`secondary-button ${
                            status === value ? 'is-active' : ''
                        }`}
                        onClick={() => setStatus(value)}
                    >
                        {value === '' ? 'Összes' : STATUS_LABELS[value]}
                    </button>
                ))}
            </div>

            {loading && <p className="admin-state">Betöltés...</p>}

            {!loading && tasks.length === 0 && (
                <p className="admin-state">Nincs megjeleníthető számlázási feladat.</p>
            )}

            {!loading && tasks.length > 0 && (
                <div className="billing-table-wrap">
                    <table className="billing-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Eladó</th>
                                <th>Stripe invoice</th>
                                <th>Számlaszám</th>
                                <th>Összeg</th>
                                <th>Állapot</th>
                                <th>Próbák</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map((task) => (
                                <tr key={task.id}>
                                    <td>{task.id}</td>
                                    <td>
                                        <strong>{task.user?.name}</strong>
                                        <br />
                                        <small>{task.user?.email}</small>
                                    </td>
                                    <td>
                                        <code>{task.stripe_invoice_id}</code>
                                    </td>
                                    <td>
                                        {task.invoice_number || '—'}
                                        {task.correction_invoice_number && (
                                            <>
                                                <br />
                                                <small>
                                                    helyesbítő:{' '}
                                                    {task.correction_invoice_number}
                                                </small>
                                            </>
                                        )}
                                    </td>
                                    <td>{formatHuf(task.gross_huf)}</td>
                                    <td>
                                        <span
                                            className={`billing-status billing-status--${task.status}`}
                                        >
                                            {STATUS_LABELS[task.status] ?? task.status}
                                        </span>
                                        {task.review_status && (
                                            <>
                                                <br />
                                                <small>felülvizsgálat: {task.review_status}</small>
                                            </>
                                        )}
                                        {task.error && (
                                            <>
                                                <br />
                                                <small className="billing-error">{task.error}</small>
                                            </>
                                        )}
                                    </td>
                                    <td>{task.attempts}</td>
                                    <td>
                                        {task.status !== 'issued' && (
                                            <button
                                                type="button"
                                                className="secondary-button"
                                                disabled={retryingId !== null}
                                                onClick={() => handleRetry(task)}
                                            >
                                                {retryingId === task.id
                                                    ? '...'
                                                    : 'Újrapróbálás'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

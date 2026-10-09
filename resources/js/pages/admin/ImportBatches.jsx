import React, { useEffect, useState } from 'react';

import {
    getImportBatches,
    setImportBatchStatus,
} from '../../api/adminImportBatches';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

import '../../../css/admin-import-batches.css';

function formatDate(value) {
    if (!value) return '—';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleString('hu-HU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/*
 * Bulk uploads, with a storefront-wide on/off switch.
 *
 * Switching a batch off hides all of its products in one action. Nothing is
 * deleted, so a batch can always be switched back on.
 */
export default function AdminImportBatches() {
    const toast = useToast();
    const confirm = useConfirm();

    const [batches, setBatches] = useState([]);
    const [counts, setCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);

    async function load() {
        setLoading(true);

        try {
            const response = await getImportBatches();
            setBatches(response.data ?? []);
            setCounts(response.counts ?? {});
        } catch (err) {
            toast.error(err.message || 'A tömeges feltöltések nem tölthetők be.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function toggle(batch) {
        const nextStatus = batch.status === 'active' ? 'disabled' : 'active';

        const confirmed = await confirm({
            message:
                nextStatus === 'disabled'
                    ? 'Inaktiválod ezt a tömeges feltöltést? A termékei eltűnnek a weboldalról.'
                    : 'Aktiválod ezt a tömeges feltöltést? A termékei újra megjelennek.',
            detail: `${batch.label} · ${batch.product_count} termék`,
            confirmLabel: nextStatus === 'disabled' ? 'Inaktiválás' : 'Aktiválás',
            cancelLabel: 'Mégsem',
        });

        if (!confirmed) return;

        setBusyId(batch.id);

        try {
            const response = await setImportBatchStatus(batch.id, nextStatus);
            toast.success(response.message);
            await load();
        } catch (err) {
            toast.error(err.message || 'A művelet nem sikerült.');
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="admin-page admin-batches">
            <header className="admin-page__header">
                <div>
                    <p className="eyebrow">Adminisztráció</p>
                    <h1>Tömeges feltöltések</h1>
                </div>

                <button type="button" className="secondary-button" onClick={load}>
                    Frissítés
                </button>
            </header>

            <section className="batch-counters">
                <div className="batch-counter">
                    <span>Aktív feltöltés</span>
                    <strong>{counts.active ?? 0}</strong>
                </div>
                <div className="batch-counter batch-counter--muted">
                    <span>Inaktív feltöltés</span>
                    <strong>{counts.disabled ?? 0}</strong>
                </div>
            </section>

            {loading && <p className="admin-state">Betöltés...</p>}

            {!loading && batches.length === 0 && (
                <p className="admin-state">Még nincs tömeges feltöltés.</p>
            )}

            {!loading && batches.length > 0 && (
                <div className="batch-table-wrap">
                    <table className="batch-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Megnevezés</th>
                                <th>Eladó</th>
                                <th>Üzlet</th>
                                <th>Termékek</th>
                                <th>Állapot</th>
                                <th>Létrehozva</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {batches.map((batch) => (
                                <tr key={batch.id}>
                                    <td>{batch.id}</td>
                                    <td><strong>{batch.label}</strong></td>
                                    <td>
                                        {batch.seller?.name}
                                        <br />
                                        <small>{batch.seller?.email}</small>
                                    </td>
                                    <td>{batch.store?.name}</td>
                                    <td>{batch.product_count}</td>
                                    <td>
                                        <span
                                            className={`batch-status batch-status--${batch.status}`}
                                        >
                                            {batch.status === 'active' ? 'Aktív' : 'Inaktív'}
                                        </span>
                                        {batch.disabled_at && (
                                            <>
                                                <br />
                                                <small>{formatDate(batch.disabled_at)}</small>
                                            </>
                                        )}
                                    </td>
                                    <td>{formatDate(batch.created_at)}</td>
                                    <td>
                                        <button
                                            type="button"
                                            className={
                                                batch.status === 'active'
                                                    ? 'danger-button'
                                                    : 'secondary-button'
                                            }
                                            disabled={busyId !== null}
                                            onClick={() => toggle(batch)}
                                        >
                                            {busyId === batch.id
                                                ? '...'
                                                : batch.status === 'active'
                                                    ? 'Inaktiválás'
                                                    : 'Aktiválás'}
                                        </button>
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

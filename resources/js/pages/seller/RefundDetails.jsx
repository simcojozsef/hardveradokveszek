import React, { useEffect, useState } from 'react';
import {
    getRefund,
    completeRefund,
} from '../../api/seller';

export default function RefundDetails({
    refundId,
    onClose,
    onCompleted,
}) {
    const [refund, setRefund] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [paymentProof, setPaymentProof] = useState(null);
    const [sellerNote, setSellerNote] = useState('');

    useEffect(() => {
        async function loadRefund() {
            try {
                setLoading(true);
                setError('');

                const response =
                    await getRefund(refundId);

                setRefund(response.data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadRefund();
    }, [refundId]);

    function handleFileChange(event) {
        const file =
            event.target.files?.[0] ?? null;

        setPaymentProof(file);
        setError('');

        if (!file) {
            return;
        }

        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
        ];

        if (!allowedTypes.includes(file.type)) {
            setPaymentProof(null);
            setError(
                'Csak PDF, JPG vagy PNG fájl tölthető fel.'
            );

            event.target.value = '';
            return;
        }

        const maxSize =
            10 * 1024 * 1024;

        if (file.size > maxSize) {
            setPaymentProof(null);
            setError(
                'A fájl mérete nem haladhatja meg a 10 MB-ot.'
            );

            event.target.value = '';
        }
    }

    async function handleCompleteRefund(event) {
        event.preventDefault();

        if (!paymentProof) {
            setError(
                'Az átutalási bizonylat feltöltése kötelező.'
            );
            return;
        }

        setUploading(true);
        setError('');

        try {
            const formData = new FormData();

            formData.append(
                'payment_proof',
                paymentProof
            );

            if (sellerNote.trim()) {
                formData.append(
                    'seller_note',
                    sellerNote.trim()
                );
            }

            const response =
                await completeRefund(
                    refundId,
                    formData
                );

            setRefund(response.data);

            if (onCompleted) {
                onCompleted(response.data);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    }

    if (loading) {
        return (
            <section className="refund-details">
                Visszatérítési adatok betöltése...
            </section>
        );
    }

    if (error && !refund) {
        return (
            <section className="refund-details">
                <div className="form-error">
                    {error}
                </div>
            </section>
        );
    }

    if (!refund) {
        return null;
    }

    const isCompleted =
        refund.status === 'refund_completed';

    return (
        <section className="refund-details">
            <div className="refund-details__header">
                <div>
                    <p className="eyebrow">
                        Visszatérítés
                    </p>

                    <h3>
                        Visszatérítési igény
                    </h3>
                </div>

                <strong>
                    {Number(
                        refund.amount
                    ).toLocaleString('hu-HU')}{' '}
                    Ft
                </strong>
            </div>

            {error && (
                <div className="form-error">
                    {error}
                </div>
            )}

            <div className="refund-details__grid">
                <div>
                    <span>Keresztnév</span>
                    <strong>
                        {refund.first_name}
                    </strong>
                </div>

                <div>
                    <span>Vezetéknév</span>
                    <strong>
                        {refund.last_name}
                    </strong>
                </div>

                <div>
                    <span>Bank neve</span>
                    <strong>
                        {refund.bank_name}
                    </strong>
                </div>

                <div>
                    <span>IBAN</span>
                    <strong>
                        {refund.iban}
                    </strong>
                </div>

                <div>
                    <span>SWIFT kód</span>
                    <strong>
                        {refund.swift_code}
                    </strong>
                </div>

                <div>
                    <span>Számlaszám</span>
                    <strong>
                        {refund.account_number}
                    </strong>
                </div>

                <div>
                    <span>E-mail</span>
                    <strong>
                        {refund.email}
                    </strong>
                </div>

                <div>
                    <span>Telefonszám</span>
                    <strong>
                        {refund.phone}
                    </strong>
                </div>
            </div>

            {!isCompleted ? (
                <form
                    className="refund-details__payment"
                    onSubmit={handleCompleteRefund}
                >
                    <div>
                        <p className="eyebrow">
                            Átutalási bizonylat
                        </p>

                        <h4>
                            Refund teljesítése
                        </h4>
                    </div>

                    <label className="form-field">
                        <span>
                            Átutalási bizonylat
                        </span>

                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileChange}
                            required
                        />

                        <small className="form-help">
                            PDF, JPG vagy PNG. Maximum 10 MB.
                        </small>
                    </label>

                    {paymentProof && (
                        <div className="refund-details__selected-file">
                            <strong>
                                Kiválasztott fájl:
                            </strong>

                            <span>
                                {paymentProof.name}
                            </span>
                        </div>
                    )}

                    <label className="form-field">
                        <span>
                            Megjegyzés
                        </span>

                        <textarea
                            value={sellerNote}
                            onChange={(event) =>
                                setSellerNote(
                                    event.target.value
                                )
                            }
                            rows={4}
                            placeholder="Opcionális megjegyzés az átutalással kapcsolatban..."
                        />
                    </label>

                    <div className="refund-details__actions">
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={onClose}
                            disabled={uploading}
                        >
                            Bezárás
                        </button>

                        <button
                            type="submit"
                            className="button"
                            disabled={uploading}
                        >
                            {uploading
                                ? 'Feldolgozás...'
                                : 'Visszatérítés teljesítve'}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="refund-details__completed">
                    <strong>
                        A visszatérítés teljesítve.
                    </strong>

                    <p>
                        Az átutalási bizonylat sikeresen
                        feltöltve.
                    </p>

                    {refund.completed_at && (
                        <p className="form-help">
                            Teljesítve:{' '}
                            {new Date(
                                refund.completed_at
                            ).toLocaleString(
                                'hu-HU'
                            )}
                        </p>
                    )}

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={onClose}
                    >
                        Bezárás
                    </button>
                </div>
            )}
        </section>
    );
}
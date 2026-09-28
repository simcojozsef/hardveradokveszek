import React, { useEffect, useState } from 'react';
import { getMyOrders, updateMyOrderStatus } from '../../api/seller';
import RefundDetails from './RefundDetails';

const statusLabels = {
    pending: 'Feldolgozás alatt',
    processing: 'Csomag kész',
    shipped: 'Feladva',
    completed: 'Kézbesítve',
};

const nextStatus = {
    pending: 'processing',
    processing: 'shipped',
};

const nextStatusLabels = {
    pending: 'Csomag kész',
    processing: 'Feladtam',
};

function formatRemainingTime(deadline) {
    if (!deadline) {
        return null;
    }

    const difference =
        new Date(deadline).getTime() - Date.now();

    if (difference <= 0) {
        return {
            hours: 0,
            minutes: 0,
            expired: true,
        };
    }

    const totalMinutes = Math.floor(
        difference / 1000 / 60
    );

    return {
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60,
        expired: false,
    };
}

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updatingId, setUpdatingId] = useState(null);
    const [now, setNow] = useState(Date.now());
    const [refundId, setRefundId] = useState(null);

    async function loadOrders() {
        try {
            setLoading(true);
            setError('');

            const response = await getMyOrders();

            setOrders(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadOrders();
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(Date.now());
        }, 60000);

        return () => clearInterval(timer);
    }, []);

    async function handleStatusUpdate(order, status) {
        const label =
            nextStatusLabels[order.status];

        if (!label) {
            return;
        }

        if (
            !window.confirm(
                `Biztosan "${label}" állapotba állítod ezt a rendelést?`
            )
        ) {
            return;
        }

        try {
            setUpdatingId(order.id);
            setError('');

            const response =
                await updateMyOrderStatus(
                    order.id,
                    status
                );

            setOrders((current) =>
                current.map((item) =>
                    item.id === order.id
                        ? response.data
                        : item
                )
            );
        } catch (err) {
            setError(err.message);
        } finally {
            setUpdatingId(null);
        }
    }

    if (loading) {
        return (
            <div className="seller-page">
                <p>Rendelések betöltése...</p>
            </div>
        );
    }

    return (
        <div className="seller-page seller-orders-page">
            <div className="seller-page__header">
                <div>
                    <p className="eyebrow">Üzlet</p>
                    <h1>Rendelések</h1>
                </div>
            </div>

            {error && (
                <div className="form-error">
                    {error}
                </div>
            )}

            {orders.length === 0 ? (
                <section className="dashboard-card">
                    <div className="seller-empty-products">
                        <h3>Még nincs rendelésed</h3>

                        <p>
                            Az üzletedhez érkező rendelések
                            itt fognak megjelenni.
                        </p>
                    </div>
                </section>
            ) : (
                <div className="seller-orders-list">
                    {orders.map((order) => {
                        const next =
                            nextStatus[order.status];

                        const isBuyerConfirmationPending =
                            order.status === 'shipped' &&
                            order.buyer_confirmation_status === 'pending';

                        const countdown = isBuyerConfirmationPending
                            ? formatRemainingTime(
                                order.buyer_confirmation_deadline_at
                            )
                            : null;

                        return (
                            <article
                                key={order.id}
                                className="seller-order-card"
                            >
                                <div className="seller-order-card__header">
                                    <div>
                                        <p className="eyebrow">
                                            Rendelés
                                        </p>

                                        <h2>
                                            #{order.id}
                                        </h2>
                                    </div>

                                    <span
                                        className={`order-status order-status--${order.status}`}
                                    >
                                        {statusLabels[
                                            order.status
                                        ] ?? order.status}
                                    </span>
                                </div>

                                <div className="seller-order-card__buyer">
                                    <h3>Vásárló</h3>

                                    <strong>
                                        {
                                            order.order
                                                ?.buyer_name
                                        }
                                    </strong>

                                    <span>
                                        {
                                            order.order
                                                ?.buyer_email
                                        }
                                    </span>

                                    <span>
                                        {
                                            order.order
                                                ?.buyer_phone
                                        }
                                    </span>
                                </div>

                                <div className="seller-order-card__shipping">
                                    <h3>Szállítási cím</h3>

                                    <span>
                                        {
                                            order.order
                                                ?.shipping_postal_code
                                        }{' '}
                                        {
                                            order.order
                                                ?.shipping_city
                                        }
                                    </span>

                                    <span>
                                        {
                                            order.order
                                                ?.shipping_address
                                        }
                                    </span>
                                </div>

                                <div className="seller-order-items">
                                    {order.order?.items?.map(
                                        (item) => (
                                            <div
                                                key={item.id}
                                                className="seller-order-item"
                                            >
                                                <div>
                                                    <strong>
                                                        {
                                                            item.product_name
                                                        }
                                                    </strong>

                                                    <span>
                                                        {item.quantity}{' '}
                                                        db
                                                    </span>
                                                </div>

                                                <strong>
                                                    {Number(
                                                        item.subtotal
                                                    ).toLocaleString(
                                                        'hu-HU'
                                                    )}{' '}
                                                    Ft
                                                </strong>
                                            </div>
                                        )
                                    )}
                                </div>

                                <div className="seller-order-card__footer">
                                    <div>
                                        <span>
                                            Saját rendelési
                                            részösszeg
                                        </span>

                                        <strong>
                                            {Number(
                                                order.total
                                            ).toLocaleString(
                                                'hu-HU'
                                            )}{' '}
                                            Ft
                                        </strong>
                                    </div>

                                    {next && (
                                        <button
                                            type="button"
                                            className="seller-button"
                                            disabled={
                                                updatingId ===
                                                order.id
                                            }
                                            onClick={() =>
                                                handleStatusUpdate(
                                                    order,
                                                    next
                                                )
                                            }
                                        >
                                            {updatingId ===
                                            order.id
                                                ? 'Mentés...'
                                                : nextStatusLabels[
                                                      order.status
                                                  ]}
                                        </button>
                                    )}

                                    {isBuyerConfirmationPending && countdown && (
                                        <div className="seller-order-confirmation">
                                            {countdown.expired ? (
                                                <span className="seller-order-expired">
                                                    A visszaigazolási idő lejárt.
                                                </span>
                                            ) : (
                                                <strong>
                                                    A vásárlónak {countdown.hours} óra{' '}
                                                    {countdown.minutes} perce van hátra
                                                    a kézbesítést visszaigazolni.
                                                </strong>
                                            )}
                                        </div>
                                    )}

                                    {order.status ===
                                        'completed' && (
                                        <span className="seller-order-complete">
                                            A rendelés kézbesítve.
                                        </span>
                                    )}

                                    {order.buyer_confirmation_status ===
                                        'rejected' && (
                                        <span className="seller-order-rejected">
                                            A vásárló jelezte, hogy nem
                                            kapta meg a rendelést.
                                        </span>
                                    )}

                                    {order.refund?.status === 'refund_requested' && (
                                        <div className="seller-order-refund">
                                            <strong>
                                                Visszatérítési igény érkezett.
                                            </strong>

                                            <button
                                                type="button"
                                                className="secondary-button"
                                                onClick={() => setRefundId(order.refund.id)}
                                            >
                                                Visszatérítés részletei
                                            </button>
                                        </div>
                                    )}

                                    {order.refund?.status ===
                                        'refund_completed' && (
                                        <span className="seller-order-complete">
                                            A visszatérítés teljesítve.
                                        </span>
                                    )}
                                </div>

                                {refundId === order.refund?.id && (
                                    <RefundDetails
                                        refundId={refundId}
                                        onClose={() => setRefundId(null)}
                                        onCompleted={() => {
                                            loadOrders();
                                        }}
                                    />
                                )}
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
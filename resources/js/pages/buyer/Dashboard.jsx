import React, { useEffect, useState } from 'react';

import { getMyOrders, confirmOrderReceipt,getRefundProof } from '../../api/buyer';

import RefundForm from './RefundForm';

import BuyerMessageNotice from '../../components/BuyerMessageNotice';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';

const orderStatusLabels = {

    pending: 'Feldolgozás alatt',

    processing: 'Csomag kész',

    shipped: 'Feladva',

    completed: 'Kézbesítve',

};

const buyerConfirmationLabels = {

    pending: 'Visszaigazolásra vár',

    received: 'Megkaptam',

    rejected: 'Nem kaptam meg',

    expired: 'Visszaigazolási idő lejárt',

};

function getRemainingTime(deadline) {

    if (!deadline) {

        return null;

    }

    const difference =

        new Date(deadline).getTime() -

        Date.now();

    if (difference <= 0) {

        return {

            hours: 0,

            minutes: 0,

            seconds: 0,

            expired: true,

        };

    }

    const totalSeconds = Math.floor(

        difference / 1000

    );

    return {

        hours: Math.floor(

            totalSeconds / 3600

        ),

        minutes: Math.floor(

            (totalSeconds % 3600) / 60

        ),

        seconds: totalSeconds % 60,

        expired: false,

    };

}

function formatCountdown(time) {

    if (!time) {

        return '';

    }

    return `${time.hours} óra ${time.minutes} perc`;

}

export default function Dashboard() {

    const confirm = useConfirm();

    const toast = useToast();

    const [orders, setOrders] = useState([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState('');

    const [processingGroupId, setProcessingGroupId] =

        useState(null);

    const [refundGroupId, setRefundGroupId] =

        useState(null);

    const [now, setNow] = useState(Date.now());

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

    async function handleViewRefundProof(refundId) {

        try {

            setError('');

            const blob = await getRefundProof(refundId);

            const url = window.URL.createObjectURL(blob);

            window.open(url, '_blank');

            setTimeout(() => {

                window.URL.revokeObjectURL(url);

            }, 60000);

        } catch (err) {

            setError(err.message);

        }

    }

    useEffect(() => {

        loadOrders();

    }, []);

    /*

    |--------------------------------------------------------------------------

    | Live countdown

    |--------------------------------------------------------------------------

    */

    useEffect(() => {

        const timer = setInterval(() => {

            setNow(Date.now());

        }, 1000);

        return () => clearInterval(timer);

    }, []);

    async function handleReceipt(

        orderSellerGroup,

        action

    ) {

        const message =

            action === 'received'

                ? 'Megkaptad ezt a rendelést?'

                : 'Biztosan nem kaptad meg ezt a rendelést?';

        if (!(await confirm({ message }))) {

            return;

        }

        try {

            setProcessingGroupId(

                orderSellerGroup.id

            );

            setError('');

            const response =

                await confirmOrderReceipt(

                    orderSellerGroup.id,

                    action

                );

            /*

            |--------------------------------------------------------------------------

            | Update the affected seller group inside the order

            |--------------------------------------------------------------------------

            */

            setOrders((current) =>

                current.map((order) => {

                    if (

                        order.id !==

                        orderSellerGroup.order_id

                    ) {

                        return order;

                    }

                    return {

                        ...order,

                        seller_groups:

                            order.seller_groups?.map(

                                (group) =>

                                    group.id ===

                                    orderSellerGroup.id

                                        ? response.data

                                        : group

                            ),

                    };

                })

            );

        } catch (err) {

            setError(err.message);

        } finally {

            setProcessingGroupId(null);

        }

    }

    if (loading) {

        return (

            <main className="page">

                Rendelések betöltése...

            </main>

        );

    }

    return (

        <main className="page buyer-dashboard">

            <header>

                <p className="eyebrow">

                    Vásárlói fiók

                </p>

                <h1>Rendeléseim</h1>

            </header>

            <BuyerMessageNotice />

            {error && (

                <div className="form-error">

                    {error}

                </div>

            )}

            {orders.length === 0 ? (

                <section className="dashboard-card">

                    <h2>Még nincs rendelésed</h2>

                    <p>

                        Az általad leadott rendelések itt

                        jelennek majd meg.

                    </p>

                </section>

            ) : (

                <div className="buyer-orders">

                    {orders.map((order) => (

                        <article

                            key={order.id}

                            className="buyer-order-card"

                        >

                            <div className="buyer-order-card__header">

                                <div>

                                    <span>

                                        Rendelés #{order.id}

                                    </span>

                                    <h2>

                                        {Number(

                                            order.total

                                        ).toLocaleString('hu-HU')}{' '}

                                        Ft

                                    </h2>

                                </div>

                                <span className="order-status">

                                    {orderStatusLabels[

                                        order.status

                                    ] ?? order.status}

                                </span>

                            </div>

                            {order.seller_groups?.map(

                                (group) => {

                                    const remaining =

                                        group.status === 'shipped' &&

                                        group.buyer_confirmation_status ===

                                            'pending'

                                            ? getRemainingTime(

                                                  group.buyer_confirmation_deadline_at

                                              )

                                            : null;

                                    const isConfirmationPending =

                                        group.status ===

                                            'shipped' &&

                                        group.buyer_confirmation_status ===

                                            'pending';

                                    const isRejected =

                                        group.buyer_confirmation_status ===

                                        'rejected';

                                    const isReceived =

                                        group.buyer_confirmation_status ===

                                        'received';

                                    const isExpired =

                                        group.buyer_confirmation_status ===

                                        'expired';

                                    return (

                                        <section

                                            key={group.id}

                                            className="buyer-order-group"

                                        >

                                            <div className="buyer-order-group__header">

                                                <div>

                                                    <p className="eyebrow">

                                                        Üzlet

                                                    </p>

                                                    <h3>

                                                        {group.store?.name}

                                                    </h3>

                                                </div>

                                            </div>

                                            <div className="buyer-order-items">

                                                {order.items

                                                    ?.filter(

                                                        (item) =>

                                                            item.store_id ===

                                                            group.store_id

                                                    )

                                                    .map(

                                                        (

                                                            item

                                                        ) => (

                                                            <div className="buyer-order-item">

                                                                <div className="buyer-order-item__image">

                                                                    {item.image ? (

                                                                        <img

                                                                            src={item.image}

                                                                            alt={item.product_name}

                                                                        />

                                                                    ) : (

                                                                        <div>Nincs kép</div>

                                                                    )}

                                                                </div>

                                                                <div className="buyer-order-item__content">

                                                                    <strong>

                                                                        {item.product_name}

                                                                    </strong>

                                                                    <span>

                                                                        {item.quantity} db

                                                                    </span>

                                                                    <span>

                                                                        {Number(

                                                                            item.price

                                                                        ).toLocaleString('hu-HU')}{' '}

                                                                        Ft / db

                                                                    </span>

                                                                </div>

                                                                <strong className="buyer-order-item__subtotal">

                                                                    {Number(

                                                                        item.subtotal

                                                                    ).toLocaleString('hu-HU')}{' '}

                                                                    Ft

                                                                </strong>

                                                            </div>

                                                        )

                                                    )}

                                            </div>

                                            {isConfirmationPending &&

                                                remaining &&

                                                !remaining.expired && (

                                                    <div className="buyer-order-confirmation">

                                                        <strong>

                                                            Önnek{' '}

                                                            {formatCountdown(

                                                                remaining

                                                            )}{' '}

                                                            van hátra a

                                                            kézbesítést

                                                            visszaigazolni.

                                                        </strong>

                                                        <p>

                                                            A visszaigazolási

                                                            határidő lejárta

                                                            után a rendelés

                                                            automatikusan

                                                            kézbesítettnek

                                                            minősül.

                                                        </p>

                                                        <div className="buyer-order-actions">

                                                            <button

                                                                type="button"

                                                                className="seller-button"

                                                                disabled={

                                                                    processingGroupId ===

                                                                    group.id

                                                                }

                                                                onClick={() =>

                                                                    handleReceipt(

                                                                        group,

                                                                        'received'

                                                                    )

                                                                }

                                                            >

                                                                {processingGroupId ===

                                                                group.id

                                                                    ? 'Mentés...'

                                                                    : 'Megkaptam'}

                                                            </button>

                                                            <button

                                                                type="button"

                                                                className="secondary-button"

                                                                disabled={

                                                                    processingGroupId ===

                                                                    group.id

                                                                }

                                                                onClick={() =>

                                                                    handleReceipt(

                                                                        group,

                                                                        'rejected'

                                                                    )

                                                                }

                                                            >

                                                                Nem kaptam meg

                                                            </button>

                                                        </div>

                                                    </div>

                                                )}

                                            {isRejected && (

                                                <div className="buyer-order-dispute">

                                                    {group.refund?.status === 'refund_completed' ? (

                                                        <>

                                                            <strong>

                                                                A visszatérítés teljesítve.

                                                            </strong>

                                                            <p>

                                                                Az eladó feltöltötte az

                                                                átutalás igazolását.

                                                            </p>

                                                            <button

                                                                type="button"

                                                                className="secondary-button"

                                                                onClick={() =>

                                                                    handleViewRefundProof(

                                                                        group.refund.id

                                                                    )

                                                                }

                                                            >

                                                                Átutalási bizonylat megtekintése

                                                            </button>

                                                        </>

                                                    )  : group.refund?.status ===

                                                    'refund_requested' ? (

                                                        <>

                                                            <strong>

                                                                Visszatérítési igény elküldve.

                                                            </strong>

                                                            <p>

                                                                A visszatérítés feldolgozására

                                                                várunk.

                                                            </p>

                                                        </>

                                                    ) : refundGroupId === group.id ? (

                                                        <RefundForm

                                                            group={group}

                                                            onCancel={() =>

                                                                setRefundGroupId(null)

                                                            }

                                                            onSubmitted={() => {

                                                                setRefundGroupId(null);

                                                                loadOrders();

                                                            }}

                                                        />

                                                    ) : (

                                                        <>

                                                            <strong>

                                                                A kézbesítést elutasítottad.

                                                            </strong>

                                                            <p>

                                                                Visszatérítést kérhetsz ehhez a

                                                                rendeléshez.

                                                            </p>

                                                            <button

                                                                type="button"

                                                                className="button"

                                                                onClick={() =>

                                                                    setRefundGroupId(group.id)

                                                                }

                                                            >

                                                                Visszatérítés kérése

                                                            </button>

                                                        </>

                                                    )}

                                                </div>

                                            )}

                                            {isReceived && (

                                                <div className="buyer-order-confirmed">

                                                    <strong>

                                                        A kézbesítést

                                                        visszaigazoltad.

                                                    </strong>

                                                    <p>

                                                        Köszönjük a

                                                        visszaigazolást.

                                                    </p>

                                                </div>

                                            )}

                                            {isExpired && (

                                                <div className="buyer-order-confirmed">

                                                    <strong>

                                                        Kézbesítve

                                                    </strong>

                                                    <p>

                                                        A 120 órás

                                                        visszaigazolási

                                                        idő lejárt, ezért

                                                        a rendelés

                                                        automatikusan

                                                        kézbesítettnek

                                                        minősült.

                                                    </p>

                                                </div>

                                            )}

                                            {group.status ===

                                                'completed' &&

                                                !isReceived &&

                                                !isExpired && (

                                                    <div className="buyer-order-confirmed">

                                                        <strong>

                                                            Kézbesítve

                                                        </strong>

                                                    </div>

                                                )}

                                        </section>

                                    );

                                }

                            )}

                        </article>

                    ))}

                </div>

            )}

        </main>

    );

}
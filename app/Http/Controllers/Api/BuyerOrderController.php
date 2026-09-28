<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderSellerGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class BuyerOrderController extends Controller
{
    public function index(Request $request)
    {
        $orders = $request->user()
            ->orders()
            ->with([
                'items.product.images',
                'sellerGroups',
                'sellerGroups.store',
                'sellerGroups.refund',
            ])
            ->latest()
            ->paginate(10);

        return OrderResource::collection($orders);
    }

    public function show(
        Request $request,
        Order $order
    ): OrderResource {
        Gate::authorize('view', $order);

        $order->load([
            'items.product.images',
            'sellerGroups',
            'sellerGroups.store',
            'sellerGroups.refund',
        ]);

        return new OrderResource($order);
    }

    public function receipt(
        Request $request,
        OrderSellerGroup $orderSellerGroup
    ): JsonResponse {
        $orderSellerGroup->load('order');

        /*
        |--------------------------------------------------------------------------
        | Ownership
        |--------------------------------------------------------------------------
        */

        if (
            $orderSellerGroup->order->user_id !==
            $request->user()->id
        ) {
            abort(403);
        }

        /*
        |--------------------------------------------------------------------------
        | Validate action
        |--------------------------------------------------------------------------
        */

        $validated = $request->validate([
            'action' => [
                'required',
                'in:received,rejected',
            ],
        ]);

        /*
        |--------------------------------------------------------------------------
        | Must be shipped
        |--------------------------------------------------------------------------
        */

        if ($orderSellerGroup->status !== 'shipped') {
            return response()->json([
                'message' =>
                    'Ez a rendelés jelenleg nem vár kézbesítési visszaigazolásra.',
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | Must still be awaiting buyer confirmation
        |--------------------------------------------------------------------------
        */

        if (
            $orderSellerGroup->buyer_confirmation_status !==
            'pending'
        ) {
            return response()->json([
                'message' =>
                    'Ehhez a rendeléshez már nincs aktív visszaigazolási lehetőség.',
            ], 409);
        }

        /*
        |--------------------------------------------------------------------------
        | 120-hour deadline
        |--------------------------------------------------------------------------
        */

        if (
            !$orderSellerGroup->buyer_confirmation_deadline_at ||
            $orderSellerGroup->buyer_confirmation_deadline_at->isPast()
        ) {
            $orderSellerGroup->update([
                'status' => 'completed',
                'buyer_confirmation_status' => 'expired',
            ]);

            $this->refreshParentOrderStatus(
                $orderSellerGroup->order_id
            );

            return response()->json([
                'message' =>
                    'A 120 órás visszaigazolási idő lejárt. A rendelés automatikusan kézbesítettnek minősült.',
                'data' => $orderSellerGroup
                    ->fresh()
                    ->load([
                        'order',
                        'order.items',
                        'store',
                        'refund',
                    ]),
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Buyer received the order
        |--------------------------------------------------------------------------
        */

        if ($validated['action'] === 'received') {
            $orderSellerGroup->update([
                'status' => 'completed',
                'buyer_confirmation_status' => 'received',
                'buyer_confirmed_at' => now(),
            ]);

            $message =
                'A rendelés kézbesítése sikeresen visszaigazolva.';
        }

        /*
        |--------------------------------------------------------------------------
        | Buyer did not receive the order
        |--------------------------------------------------------------------------
        */

        else {
            $orderSellerGroup->update([
                'buyer_confirmation_status' => 'rejected',
                'buyer_rejected_at' => now(),
            ]);

            $message =
                'A kézbesítés elutasítva. Visszatérítést kérhetsz.';
        }

        /*
        |--------------------------------------------------------------------------
        | Refresh parent order status
        |--------------------------------------------------------------------------
        */

        $this->refreshParentOrderStatus(
            $orderSellerGroup->order_id
        );

        return response()->json([
            'message' => $message,
            'data' => $orderSellerGroup
                ->fresh()
                ->load([
                    'order',
                    'order.items',
                    'store',
                    'refund',
                ]),
        ]);
    }

    private function refreshParentOrderStatus(int $orderId): void
    {
        $groups = OrderSellerGroup::query()
            ->where('order_id', $orderId)
            ->pluck('status');

        if ($groups->isEmpty()) {
            return;
        }

        $orderStatus = 'pending';

        if (
            $groups->every(
                fn ($status) => $status === 'completed'
            )
        ) {
            $orderStatus = 'completed';
        } elseif (
            $groups->contains('shipped')
        ) {
            $orderStatus = 'shipped';
        } elseif (
            $groups->contains('processing')
        ) {
            $orderStatus = 'processing';
        }

        Order::whereKey($orderId)->update([
            'status' => $orderStatus,
        ]);
    }
}
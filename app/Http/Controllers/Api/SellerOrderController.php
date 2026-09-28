<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderSellerGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SellerOrderController extends Controller
{
    public function index(Request $request)
    {
        $store = $request->user()->store;

        if (!$store) {
            abort(404, 'You do not have a store yet.');
        }

        $groups = OrderSellerGroup::query()
            ->where('store_id', $store->id)
            ->with([
                'order',
                'order.items' => function ($query) use ($store) {
                    $query->where('store_id', $store->id);
                },
                'store',
                'refund',
            ])
            ->latest()
            ->paginate(20);

        return response()->json($groups);
    }

    public function show(
        Request $request,
        OrderSellerGroup $orderSellerGroup
    ) {
        $store = $request->user()->store;

        if (!$store) {
            abort(404, 'You do not have a store yet.');
        }

        if ($orderSellerGroup->store_id !== $store->id) {
            abort(403);
        }

        $orderSellerGroup->load([
            'order',
            'order.items' => function ($query) use ($store) {
                $query->where('store_id', $store->id);
            },
            'store',
            'refund',
        ]);

        return response()->json([
            'data' => $orderSellerGroup,
        ]);
    }

    public function updateStatus(
        Request $request,
        OrderSellerGroup $orderSellerGroup
    ): JsonResponse {
        $store = $request->user()->store;

        if (!$store) {
            abort(404, 'You do not have a store yet.');
        }

        if ($orderSellerGroup->store_id !== $store->id) {
            abort(403);
        }

        $validated = $request->validate([
            'status' => [
                'required',
                'in:processing,shipped',
            ],
        ]);

        $current = $orderSellerGroup->status;
        $next = $validated['status'];

        $allowedTransitions = [
            'pending' => ['processing'],
            'processing' => ['shipped'],
            'shipped' => [],
            'completed' => [],
        ];

        if (
            !in_array(
                $next,
                $allowedTransitions[$current] ?? [],
                true
            )
        ) {
            return response()->json([
                'message' =>
                    "Invalid status transition: {$current} → {$next}.",
            ], 422);
        }

        /*
        |--------------------------------------------------------------------------
        | pending -> processing
        |--------------------------------------------------------------------------
        */

        if (
            $current === 'pending' &&
            $next === 'processing'
        ) {
            $orderSellerGroup->update([
                'status' => 'processing',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | processing -> shipped
        |--------------------------------------------------------------------------
        |
        | Seller has shipped the order.
        | This starts the buyer's 120-hour confirmation window.
        |
        */

        if (
            $current === 'processing' &&
            $next === 'shipped'
        ) {
            $orderSellerGroup->update([
                'status' => 'shipped',
                'buyer_confirmation_status' => 'pending',
                'buyer_confirmation_deadline_at' => now()->addHours(120),
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Recalculate parent order status
        |--------------------------------------------------------------------------
        */

        $this->refreshParentOrderStatus(
            $orderSellerGroup->order_id
        );

        /*
        |--------------------------------------------------------------------------
        | Return complete updated data
        |--------------------------------------------------------------------------
        */

        return response()->json([
            'message' => 'Order status updated.',
            'data' => $orderSellerGroup
                ->fresh()
                ->load([
                    'order',
                    'order.items' => function ($query) use ($store) {
                        $query->where('store_id', $store->id);
                    },
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
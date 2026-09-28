<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Refund;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SellerRefundController extends Controller
{
    public function show(
        Request $request,
        Refund $refund
    ): JsonResponse {
        $store = $request->user()->store;

        if (!$store) {
            abort(404, 'You do not have a store yet.');
        }

        $refund->load('orderSellerGroup');

        if (
            $refund->orderSellerGroup->store_id !==
            $store->id
        ) {
            abort(403);
        }

        return response()->json([
            'data' => $refund->load(
                'orderSellerGroup.order'
            ),
        ]);
    }

    public function complete(
        Request $request,
        Refund $refund
    ): JsonResponse {
        $store = $request->user()->store;

        if (!$store) {
            abort(404, 'You do not have a store yet.');
        }

        $refund->load('orderSellerGroup');

        if (
            $refund->orderSellerGroup->store_id !==
            $store->id
        ) {
            abort(403);
        }

        $validated = $request->validate([
            'payment_proof' => [
                'required',
                'file',
                'mimes:pdf,jpg,jpeg,png',
                'max:10240',
            ],

            'seller_note' => [
                'nullable',
                'string',
                'max:2000',
            ],
        ]);

        if ($refund->status === 'refund_completed') {
            return response()->json([
                'message' =>
                    'Ez a visszatérítés már teljesített állapotban van.',
            ], 409);
        }

        $path = $request
            ->file('payment_proof')
            ->store(
                "refunds/{$refund->id}",
                'private'
            );

        $refund->update([
            'status' => 'refund_completed',
            'completed_at' => now(),
            'payment_proof_path' => $path,
            'seller_note' => $validated['seller_note'] ?? null,
        ]);

        return response()->json([
            'message' =>
                'A visszatérítés teljesítése rögzítve.',
            'data' => $refund->fresh(),
        ]);
    }
}
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RefundRequest;
use App\Models\OrderSellerGroup;
use App\Models\Refund;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class BuyerRefundController extends Controller
{
    public function store(
        RefundRequest $request,
        OrderSellerGroup $orderSellerGroup
    ): JsonResponse {
        $orderSellerGroup->load('order');

        if (
            $orderSellerGroup->order->user_id !==
            $request->user()->id
        ) {
            abort(403);
        }

        if (
            $orderSellerGroup->buyer_confirmation_status !==
            'rejected'
        ) {
            return response()->json([
                'message' =>
                    'Visszatérítés csak az elutasított kézbesítés után kérhető.',
            ], 422);
        }

        if ($orderSellerGroup->refund()->exists()) {
            return response()->json([
                'message' =>
                    'Ehhez a rendeléshez már van visszatérítési igény.',
            ], 409);
        }

        $refund = DB::transaction(function () use (
            $request,
            $orderSellerGroup
        ) {
            return Refund::create([
                'order_seller_group_id' => $orderSellerGroup->id,
                'user_id' => $request->user()->id,
                'amount' => $orderSellerGroup->total,

                'first_name' => $request->string('first_name')->toString(),
                'last_name' => $request->string('last_name')->toString(),
                'bank_name' => $request->string('bank_name')->toString(),
                'iban' => $request->string('iban')->toString(),
                'swift_code' => $request->string('swift_code')->toString(),
                'account_number' => $request->string('account_number')->toString(),
                'email' => $request->string('email')->toString(),
                'phone' => $request->string('phone')->toString(),

                'status' => 'refund_requested',
                'requested_at' => now(),
            ]);
        });

        return response()->json([
            'message' => 'A visszatérítési igény sikeresen benyújtva.',
            'refund' => $refund,
        ], 201);
    }

    public function proof(
    Request $request,
    Refund $refund
    ) {
        $refund->load('orderSellerGroup.order');

        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if (
            $refund->orderSellerGroup->order->user_id !==
            $user->id
        ) {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 403);
        }

        if (
            $refund->status !== 'refund_completed' ||
            !$refund->payment_proof_path
        ) {
            return response()->json([
                'message' => 'Payment proof not available.',
            ], 404);
        }

        $disk = Storage::disk('private');

        if (!$disk->exists($refund->payment_proof_path)) {
            return response()->json([
                'message' => 'Payment proof file not found.',
            ], 404);
        }

        return $disk->response(
            $refund->payment_proof_path
        );
    }
}
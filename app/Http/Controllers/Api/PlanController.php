<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PlanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlanController extends Controller
{
    public function __construct(
        private readonly PlanService $plans,
    ) {
    }

    /**
     * The signed-in seller's plan, limits, usage and PRO expiry.
     *
     * Read-only by design: there is no endpoint that lets a request choose a
     * plan or grant PRO. Entitlement is derived from the verified paid period
     * on the user record.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'data' => $this->plans->summaryFor($user),
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\ListingBumpService;
use App\Services\PlanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/*
 * Pre-reservation for a seller's own listing.
 *
 * The allowance is read from the paid PRO period; the plan matrix supplies the
 * per-period number. Nothing here lets a request choose how many bumps it has.
 */
class SellerBumpController extends Controller
{
    public function __construct(
        private readonly ListingBumpService $bumps,
        private readonly PlanService $plans,
    ) {
    }

    /** Current allowance and whether this listing may be bumped. */
    public function status(Request $request, Product $product): JsonResponse
    {
        Gate::authorize('update', $product);

        $user = $request->user();

        return response()->json([
            'data' => [
                'is_pro' => $this->plans->isPro($user),
                'remaining' => $this->bumps->remaining($user),
                'per_period' => (int) $this->plans->limitFor($user, 'bumps_per_period'),
                'bumped_at' => $product->bumped_at?->toIso8601String(),
                'eligibility' => $this->bumps->eligibility($user, $product),
            ],
        ]);
    }

    /** Perform the bump. */
    public function store(Request $request, Product $product): JsonResponse
    {
        Gate::authorize('update', $product);

        $result = $this->bumps->bump($request->user(), $product);

        return response()->json([
            'message' => 'A hirdetés előre sorolva.',
            'data' => $result,
        ]);
    }
}

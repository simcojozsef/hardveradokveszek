<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Services\ListingRenewalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class SellerProductRenewalController extends Controller
{
    public function __construct(
        private readonly ListingRenewalService $renewals,
    ) {
    }

    /**
     * Renew or reactivate one of the seller's own listings.
     *
     * The availability confirmation is required by the product rules; a
     * request without it is rejected rather than silently accepted.
     */
    public function store(Request $request, \App\Models\Product $product): JsonResponse
    {
        Gate::authorize('update', $product);

        $validated = $request->validate([
            'available_confirmed' => ['required', 'accepted'],
        ]);

        $renewed = $this->renewals->renew(
            $request->user(),
            $product,
            (bool) $validated['available_confirmed']
        );

        return response()->json([
            'message' => 'Hirdetés megújítva.',
            'product' => new ProductResource(
                $renewed->load(['store', 'images', 'categories'])
            ),
        ]);
    }
}

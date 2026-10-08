<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StorefrontResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/*
 * Tells the SPA whether it is running on a store subdomain.
 *
 * The middleware resolves the store from the host and stores it on the
 * request; this endpoint hands that to the frontend so it can render the
 * storefront at "/" rather than the marketplace home.
 *
 * On the apex domain (or an unknown/inactive subdomain) it answers with a
 * null store and the app keeps its normal behaviour.
 */
class StorefrontContextController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $store = $request->attributes->get('store');

        return response()->json([
            'data' => [
                'is_store_subdomain' => $store !== null,
                'store' => $store ? new StorefrontResource($store) : null,
            ],
        ]);
    }
}

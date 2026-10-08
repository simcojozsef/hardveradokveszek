<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\StoreStatisticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/*
 * Seller statistics.
 *
 * Every plan sees per-listing totals; the detailed series is PRO. The
 * response says explicitly which parts are available, so the UI does not have
 * to guess and cannot accidentally show a locked number.
 */
class SellerStatisticsController extends Controller
{
    public function __construct(
        private readonly StoreStatisticsService $statistics,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $hasAdvanced = $this->statistics->hasAdvancedAccess($user);

        $validated = $request->validate([
            'days' => ['nullable', 'integer'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $payload = [
            'has_advanced' => $hasAdvanced,
            'listing_totals' => $this->statistics->listingTotals($user),
            // Offered ranges, so the UI and the server agree on what is valid.
            'preset_ranges' => StoreStatisticsService::PRESET_RANGES,
            'max_range_days' => StoreStatisticsService::MAX_RANGE_DAYS,
            'advanced' => null,
        ];

        if ($hasAdvanced) {
            $payload['advanced'] = $this->statistics->advanced(
                $user,
                $validated['days'] ?? null,
                $validated['from'] ?? null,
                $validated['to'] ?? null,
            );
        }

        return response()->json(['data' => $payload]);
    }
}

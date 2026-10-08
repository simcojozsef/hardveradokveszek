<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AnalyticsTracker;
use App\Services\ViewTrackingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AnalyticsController extends Controller
{
    public function track(
        Request $request,
        AnalyticsTracker $tracker,
        ViewTrackingService $views,
    ): JsonResponse {
        $validated = $request->validate([
            'event' => [
                'required',
                'string',
                Rule::in([
                    'page_view',
                    'product_view',
                    'store_view',
                ]),
            ],

            'visitor_id' => [
                'required',
                'string',
                'max:100',
            ],

            'page_url' => [
                'nullable',
                'string',
                'max:2048',
            ],

            'subject_type' => [
                'nullable',
                'string',
                Rule::in([
                    'product',
                    'store',
                ]),
            ],

            'subject_id' => [
                'nullable',
                'integer',
                'min:1',
            ],
        ]);

        /*
        |--------------------------------------------------------------------------
        | Exclude admin activity from analytics
        |--------------------------------------------------------------------------
        */

        if (
            $request->user() &&
            $request->user()->isAdmin()
        ) {
            return response()->json([], 204);
        }

        $subject = null;

        if (
            $validated['subject_type'] === 'product' &&
            !empty($validated['subject_id'])
        ) {
            $subject = \App\Models\Product::find(
                $validated['subject_id']
            );
        }

        if (
            $validated['subject_type'] === 'store' &&
            !empty($validated['subject_id'])
        ) {
            $subject = \App\Models\Store::find(
                $validated['subject_id']
            );
        }

        $tracker->track(
            $validated['event'],
            $subject,
            $validated['visitor_id'],
            $validated['page_url'] ?? null,
            $request,
        );

        /*
         * Product views additionally feed the seller statistics, through the
         * privacy-preserving counter: no IP is stored there, and the same
         * visitor is counted at most once per product per 24 hours.
         */
        if (
            $validated['event'] === 'product_view'
            && $subject instanceof \App\Models\Product
        ) {
            $views->track(
                $subject,
                $request->user(),
                $validated['visitor_id'],
            );
        }

        return response()->json([
            'message' => 'Analytics event recorded.',
        ], 201);
    }
}
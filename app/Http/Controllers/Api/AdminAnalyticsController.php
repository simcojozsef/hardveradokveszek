<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnalyticsEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminAnalyticsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $days = $request->integer('days', 7);

        if (!in_array($days, [7, 30, 90], true)) {
            $days = 7;
        }

        $from = now()
            ->subDays($days - 1)
            ->startOfDay();

        $events = AnalyticsEvent::query()
            ->where('created_at', '>=', $from);

        $summary = [
            'visitors' => (clone $events)
                ->whereNotNull('visitor_id')
                ->distinct('visitor_id')
                ->count('visitor_id'),

            'page_views' => (clone $events)
                ->where('event', 'page_view')
                ->count(),

            'product_views' => (clone $events)
                ->where('event', 'product_view')
                ->count(),

            'store_views' => (clone $events)
                ->where('event', 'store_view')
                ->count(),
            'home_page_loads' => (clone $events)
                ->where('event', 'page_view')
                ->where('url', '/')
                ->count(),

            'home_page_visitors' => (clone $events)
                ->where('event', 'page_view')
                ->where('url', '/')
                ->whereNotNull('visitor_id')
                ->distinct('visitor_id')
                ->count('visitor_id'),
        ];

        $dailyRaw = (clone $events)
            ->selectRaw(
                "DATE(created_at) as date"
            )
            ->selectRaw(
                "COUNT(DISTINCT visitor_id) as visitors"
            )
            ->selectRaw(
                "SUM(CASE WHEN event = 'page_view' THEN 1 ELSE 0 END) as page_views"
            )
            ->selectRaw(
                "SUM(CASE WHEN event = 'product_view' THEN 1 ELSE 0 END) as product_views"
            )
            ->selectRaw(
                "SUM(CASE WHEN event = 'store_view' THEN 1 ELSE 0 END) as store_views"
            )
            ->groupByRaw('DATE(created_at)')
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        $daily = collect();

        for ($i = 0; $i < $days; $i++) {
            $date = $from
                ->copy()
                ->addDays($i);

            $key = $date->format('Y-m-d');

            $row = $dailyRaw->get($key);

            $daily->push([
                'date' => $key,
                'visitors' => $row
                    ? (int) $row->visitors
                    : 0,
                'page_views' => $row
                    ? (int) $row->page_views
                    : 0,
                'product_views' => $row
                    ? (int) $row->product_views
                    : 0,
                'store_views' => $row
                    ? (int) $row->store_views
                    : 0,
            ]);
        }

        $pages = (clone $events)
            ->whereNotNull('url')
            ->select(
                'url',
                DB::raw('COUNT(*) as views')
            )
            ->groupBy('url')
            ->orderByDesc('views')
            ->limit(20)
            ->get();

        $products = (clone $events)
            ->where('event', 'product_view')
            ->where('subject_type', 'App\\Models\\Product')
            ->whereNotNull('subject_id')
            ->select(
                'subject_id',
                DB::raw('COUNT(*) as views')
            )
            ->groupBy('subject_id')
            ->orderByDesc('views')
            ->limit(20)
            ->get();

        $stores = (clone $events)
            ->where('event', 'store_view')
            ->where('subject_type', 'App\\Models\\Store')
            ->whereNotNull('subject_id')
            ->select(
                'subject_id',
                DB::raw('COUNT(*) as views')
            )
            ->groupBy('subject_id')
            ->orderByDesc('views')
            ->limit(20)
            ->get();

        $productIds = $products
            ->pluck('subject_id');

        $storeIds = $stores
            ->pluck('subject_id');

        $productNames = \App\Models\Product::query()
            ->whereIn('id', $productIds)
            ->pluck('name', 'id');

        $storeNames = \App\Models\Store::query()
            ->whereIn('id', $storeIds)
            ->pluck('name', 'id');

        $products = $products->map(
            function ($item) use ($productNames) {
                return [
                    'id' => $item->subject_id,
                    'name' => $productNames[
                        $item->subject_id
                    ] ?? 'Ismeretlen termék',
                    'views' => (int) $item->views,
                ];
            }
        );

        $stores = $stores->map(
            function ($item) use ($storeNames) {
                return [
                    'id' => $item->subject_id,
                    'name' => $storeNames[
                        $item->subject_id
                    ] ?? 'Ismeretlen üzlet',
                    'views' => (int) $item->views,
                ];
            }
        );

        return response()->json([
            'data' => [
                'days' => $days,
                'summary' => $summary,
                'daily' => $daily,
                'pages' => $pages,
                'products' => $products,
                'stores' => $stores,
            ],
        ]);
    }
}
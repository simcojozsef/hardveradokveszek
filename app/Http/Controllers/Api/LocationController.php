<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\County;
use App\Models\Settlement;
use Illuminate\Http\JsonResponse;
class LocationController extends Controller
{
    public function index(): JsonResponse
    {
        $counties = County::orderBy('name')->get(['id', 'name']);
        $settlements = Settlement::orderBy('name')->get(['id', 'name', 'county_id']);
        abort_if($counties->isEmpty() || $settlements->isEmpty(), 503, 'A helyadatok még nincsenek betöltve.');
        return response()->json([
            'counties' => $counties, 'settlements' => $settlements, 'snapshot_date' => '2025-01-01',
        ]);
    }
}

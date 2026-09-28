<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Refund;
use App\Models\Store;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminDashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $stats = [
            'users' => User::count(),

            'buyers' => User::where(
                'role',
                'buyer'
            )->count(),

            'sellers' => User::where(
                'role',
                'seller'
            )->count(),

            'admins' => User::where(
                'role',
                'admin'
            )->count(),

            'stores' => Store::count(),

            'active_stores' => Store::where(
                'is_active',
                true
            )->count(),

            'products' => Product::count(),

            'active_products' => Product::where(
                'is_active',
                true
            )->count(),

            'orders' => Order::count(),

            'pending_orders' => Order::where(
                'status',
                'pending'
            )->count(),

            'refund_requests' => Refund::where(
                'status',
                'refund_requested'
            )->count(),

            'completed_refunds' => Refund::where(
                'status',
                'refund_completed'
            )->count(),
        ];

        return response()->json([
            'data' => $stats,
        ]);
    }
}
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Refund;
use App\Models\Store;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function users(): JsonResponse
    {
        $users = User::query()
            ->latest()
            ->paginate(25);

        return response()->json($users);
    }

    public function stores(): JsonResponse
    {
        $stores = Store::query()
            ->with('user')
            ->latest()
            ->paginate(25);

        return response()->json($stores);
    }

    public function products(): JsonResponse
    {
        $products = Product::query()
            ->with([
                'store',
                'images',
            ])
            ->latest()
            ->paginate(25);

        $products->getCollection()->transform(
            function ($product) {
                $primaryImage =
                    $product->images
                        ->firstWhere('is_primary', true)
                    ?? $product->images->first();

                return [
                    'id' => $product->id,
                    'store_id' => $product->store_id,
                    'name' => $product->name,
                    'slug' => $product->slug,
                    'description' => $product->description,
                    'price' => $product->price,
                    'stock' => $product->stock,
                    'is_active' => $product->is_active,
                    'created_at' => $product->created_at,

                    'image' => $primaryImage
                        ? asset('storage/' . $primaryImage->path)
                        : null,

                    'store' => $product->store
                        ? [
                            'id' => $product->store->id,
                            'name' => $product->store->name,
                            'slug' => $product->store->slug,
                        ]
                        : null,
                ];
            }
        );

        return response()->json($products);
    }

    public function orders(): JsonResponse
    {
        $orders = Order::query()
            ->with([
                'user',
                'items',
                'sellerGroups.store',
            ])
            ->latest()
            ->paginate(25);

        return response()->json($orders);
    }

    public function refunds(): JsonResponse
    {
        $refunds = Refund::query()
            ->with([
                'user',
                'orderSellerGroup',
                'orderSellerGroup.order',
                'orderSellerGroup.store',
            ])
            ->latest()
            ->paginate(25);

        return response()->json($refunds);
    }
}
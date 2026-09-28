<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderSellerGroup;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BuyerCheckoutController extends Controller
{
    public function store(Request $request): OrderResource
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:120',
            ],

            'email' => [
                'required',
                'email',
                'max:255',
            ],

            'phone' => [
                'required',
                'string',
                'max:40',
            ],

            'postal_code' => [
                'required',
                'string',
                'max:20',
            ],

            'city' => [
                'required',
                'string',
                'max:120',
            ],

            'address' => [
                'required',
                'string',
                'max:255',
            ],
        ]);

        $user = $request->user();

        $order = DB::transaction(function () use (
            $user,
            $validated
        ) {
            $cartItems = $user->cartItems()
                ->with('product')
                ->get();

            if ($cartItems->isEmpty()) {
                abort(422, 'A kosár üres.');
            }

            $total = 0;

            /*
            |--------------------------------------------------------------------------
            | Validate products and calculate order total
            |--------------------------------------------------------------------------
            */

            foreach ($cartItems as $cartItem) {
                $product = Product::query()
                    ->lockForUpdate()
                    ->findOrFail($cartItem->product_id);

                if (!$product->is_active) {
                    abort(
                        422,
                        "A(z) {$product->name} termék már nem elérhető."
                    );
                }

                if ($cartItem->quantity > $product->stock) {
                    abort(
                        422,
                        "Nincs elegendő készlet ebből: {$product->name}"
                    );
                }

                $total +=
                    (float) $product->price
                    * $cartItem->quantity;
            }

            /*
            |--------------------------------------------------------------------------
            | Create order
            |--------------------------------------------------------------------------
            */

            $order = Order::create([
                'user_id' => $user->id,
                'status' => 'pending',
                'total' => $total,

                'buyer_name' => $validated['name'],
                'buyer_email' => $validated['email'],
                'buyer_phone' => $validated['phone'],

                'shipping_postal_code' => $validated['postal_code'],
                'shipping_city' => $validated['city'],
                'shipping_address' => $validated['address'],
            ]);

            /*
            |--------------------------------------------------------------------------
            | Create order items
            |--------------------------------------------------------------------------
            */

            $sellerGroups = collect();

            foreach ($cartItems as $cartItem) {
                $product = Product::query()
                    ->lockForUpdate()
                    ->findOrFail($cartItem->product_id);

                $subtotal =
                    (float) $product->price
                    * $cartItem->quantity;

                $order->items()->create([
                    'store_id' => $product->store_id,
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'price' => $product->price,
                    'quantity' => $cartItem->quantity,
                    'subtotal' => $subtotal,
                ]);

                /*
                |--------------------------------------------------------------------------
                | Collect seller-specific totals
                |--------------------------------------------------------------------------
                */

                $sellerGroups->push([
                    'store_id' => $product->store_id,
                    'subtotal' => $subtotal,
                ]);

                /*
                |--------------------------------------------------------------------------
                | Reduce stock
                |--------------------------------------------------------------------------
                */

                $product->decrement(
                    'stock',
                    $cartItem->quantity
                );
            }

            /*
            |--------------------------------------------------------------------------
            | Create one seller group per store
            |--------------------------------------------------------------------------
            */

            foreach (
                $sellerGroups->groupBy('store_id')
                as $storeId => $items
            ) {
                OrderSellerGroup::create([
                    'order_id' => $order->id,
                    'store_id' => $storeId,
                    'status' => 'pending',
                    'total' => $items->sum('subtotal'),
                ]);
            }

            /*
            |--------------------------------------------------------------------------
            | Clear cart
            |--------------------------------------------------------------------------
            */

            $user->cartItems()->delete();

            return $order;
        });

        return new OrderResource(
            $order->load('items')
        );
    }
}
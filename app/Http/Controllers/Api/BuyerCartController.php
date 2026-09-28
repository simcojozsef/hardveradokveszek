<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CartItemResource;
use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BuyerCartController extends Controller
{
    public function index(Request $request)
    {
        $items = $request->user()
            ->cartItems()
            ->with([
                'product.images',
            ])
            ->get();

        return CartItemResource::collection($items);
    }

    public function store(
        Request $request,
        Product $product
    ): CartItemResource|JsonResponse {
        $validated = $request->validate([
            'quantity' => [
                'required',
                'integer',
                'min:1',
            ],
        ]);

        if (!$product->is_active) {
            return response()->json([
                'message' => 'Ez a termék jelenleg nem elérhető.',
            ], 422);
        }

        if ($product->stock < $validated['quantity']) {
            return response()->json([
                'message' => 'Nincs elegendő készlet.',
            ], 422);
        }

        $item = CartItem::firstOrNew([
            'user_id' => $request->user()->id,
            'product_id' => $product->id,
        ]);

        $newQuantity =
            ($item->exists ? $item->quantity : 0)
            + $validated['quantity'];

        if ($newQuantity > $product->stock) {
            return response()->json([
                'message' => 'A kívánt mennyiség meghaladja a készletet.',
            ], 422);
        }

        $item->quantity = $newQuantity;
        $item->save();

        return new CartItemResource(
            $item->load('product')
        );
    }

    public function update(
        Request $request,
        CartItem $cartItem
    ): CartItemResource|JsonResponse {
        if ($cartItem->user_id !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'quantity' => [
                'required',
                'integer',
                'min:1',
            ],
        ]);

        $product = $cartItem->product;

        if ($validated['quantity'] > $product->stock) {
            return response()->json([
                'message' => 'Nincs elegendő készlet.',
            ], 422);
        }

        $cartItem->update([
            'quantity' => $validated['quantity'],
        ]);

        return new CartItemResource(
            $cartItem->fresh()->load('product')
        );
    }

    public function destroy(
        Request $request,
        CartItem $cartItem
    ): JsonResponse {
        if ($cartItem->user_id !== $request->user()->id) {
            abort(403);
        }

        $cartItem->delete();

        return response()->json([
            'message' => 'A termék eltávolítva a kosárból.',
        ]);
    }

    public function clear(Request $request): JsonResponse
    {
        $request->user()
            ->cartItems()
            ->delete();

        return response()->json([
            'message' => 'A kosár kiürítve.',
        ]);
    }
}
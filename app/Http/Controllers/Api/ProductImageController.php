<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductImageRequest;
use App\Http\Resources\ProductImageResource;
use App\Http\Requests\UpdateProductImageRequest;
use App\Models\Product;
use App\Models\ProductImage;
use App\Services\ListingLimitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class ProductImageController extends Controller
{
    public function index(Product $product)
    {
        $product->load('images');

        return ProductImageResource::collection($product->images);
    }

    public function store(
        ProductImageRequest $request,
        Product $product
    ): ProductImageResource {
        Gate::authorize('update', $product);

        /*
         * Checked before the file is written, so an over-limit upload never
         * touches storage. The seller lock keeps two concurrent uploads from
         * both landing in the last free slot.
         */
        $seller = $product->store?->user;

        if ($seller) {
            app(ListingLimitService::class)->withSellerLock(
                $seller,
                function ($locked) use ($product) {
                    app(ListingLimitService::class)
                        ->assertCanAddPhotos($locked, $product);
                }
            );
        }

        $isPrimary = $request->boolean('is_primary', false);

        $sortOrder = $request->integer(
            'sort_order',
            $product->images()->max('sort_order') + 1
        );

        $path = $request->file('image')->store(
            "products/{$product->id}",
            'public'
        );

        $image = DB::transaction(function () use (
            $product,
            $path,
            $sortOrder,
            $isPrimary
        ) {
            if ($isPrimary) {
                $product->images()->update([
                    'is_primary' => false,
                ]);
            }

            return $product->images()->create([
                'path' => $path,
                'sort_order' => $sortOrder,
                'is_primary' => $isPrimary,
            ]);
        });

        return new ProductImageResource($image);
    }

    public function update(
        UpdateProductImageRequest $request,
        ProductImage $productImage
    ): ProductImageResource {
        Gate::authorize('update', $productImage->product);

        $isPrimary = $request->boolean(
            'is_primary',
            $productImage->is_primary
        );

        DB::transaction(function () use (
            $productImage,
            $request,
            $isPrimary
        ) {
            if ($isPrimary) {
                $productImage->product->images()
                    ->whereKeyNot($productImage->id)
                    ->update([
                        'is_primary' => false,
                    ]);
            }

            $productImage->update([
                'sort_order' => $request->integer(
                    'sort_order',
                    $productImage->sort_order
                ),
                'is_primary' => $isPrimary,
            ]);

            if ($request->hasFile('image')) {
                $oldPath = $productImage->path;

                $newPath = $request->file('image')->store(
                    "products/{$productImage->product_id}",
                    'public'
                );

                $productImage->update([
                    'path' => $newPath,
                ]);

                Storage::disk('public')->delete($oldPath);
            }
        });

        return new ProductImageResource(
            $productImage->fresh()
        );
    }

    public function destroy(
        ProductImage $productImage
    ): JsonResponse {
        Gate::authorize('update', $productImage->product);

        $path = $productImage->path;

        $productImage->delete();

        Storage::disk('public')->delete($path);

        return response()->json([
            'message' => 'Product image deleted successfully.',
        ]);
    }
}
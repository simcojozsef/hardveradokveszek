<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $categoryIds = $this->relationLoaded('categories')
            ? $this->categories->pluck('id')->map(fn ($id) => (int) $id)->all() : [];
        if ($this->category_id !== null) array_unshift($categoryIds, (int) $this->category_id);
        $categoryIds = array_values(array_unique($categoryIds));
        return [
            'id' => $this->id, 'store_id' => $this->store_id,
            'category_id' => $this->category_id,
            'category_ids' => $categoryIds,
            'categories' => $this->whenLoaded('categories', fn () => $this->categories->map(fn ($category) => [
                'id' => $category->id, 'name' => $category->name, 'slug' => $category->slug,
            ])),
            'name' => $this->name, 'slug' => $this->slug,
            'description' => $this->description, 'price' => $this->price,
            'stock' => $this->stock, 'is_active' => $this->is_active,
            'condition' => $this->condition, 'listing_type' => $this->listing_type,
            'county_id' => $this->county_id, 'settlement_id' => $this->settlement_id,
            'county' => $this->county, 'settlement' => $this->settlement,
            'brand' => $this->brand, 'model' => $this->model,
            'shipping_available' => $this->shipping_available,
            'shipping_methods' => $this->shipping_methods ?? [],
            'contains_ai' => $this->contains_ai,
            'has_warranty' => $this->has_warranty,
            'warranty_expires_at' => $this->warranty_expires_at?->format('Y-m-d'),
            'personal_pickup' => $this->personal_pickup,
            'created_at' => $this->created_at,
            'listing_status' => $this->effectiveListingStatus(),
            'posted_at' => $this->posted_at?->toISOString(),
            'expires_at' => $this->expires_at?->toISOString(),
            'sold_at' => $this->sold_at?->toISOString(),
            'expired_at' => $this->effectiveListingStatus() === \App\Models\Product::EXPIRED
                ? $this->expires_at?->toISOString() : $this->expired_at?->toISOString(),
            'removed_at' => $this->deleted_at?->toISOString(),
            'store' => $this->whenLoaded('store', function () {
                return [
                    'id' => $this->store->id, 'name' => $this->store->name,
                    'slug' => $this->store->slug,
                    'logo' => $this->store->logo ? asset('storage/' . $this->store->logo) : null,
                    'contact_phone' => $this->store->contact_phone,
                    'contact_email' => $this->store->contact_email,
                    'is_trusted_seller' => $this->store->is_trusted_seller,
                    'positive_ratings_count' => (int) $this->store->positive_ratings_count,
                    'negative_ratings_count' => (int) $this->store->negative_ratings_count,
                ];
            }),
            'images' => ProductImageResource::collection($this->whenLoaded('images')),
        ];
    }
}

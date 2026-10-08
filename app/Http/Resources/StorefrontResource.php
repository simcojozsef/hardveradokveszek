<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/*
 * The public storefront payload for a store subdomain.
 *
 * Only public data: never the billing profile, tax number or any admin field.
 * The contact details are included because they are already shown on the
 * store page, and the masked reveal is a UI concern.
 */
class StorefrontResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'logo' => $this->logo ? url(Storage::url($this->logo)) : null,
            'is_active' => $this->is_active,
            'is_trusted_seller' => $this->is_trusted_seller,
            'positive_ratings_count' => (int) $this->positive_ratings_count,
            'negative_ratings_count' => (int) $this->negative_ratings_count,
            'contact_phone' => $this->contact_phone,
            'contact_email' => $this->contact_email,
            'created_at' => $this->created_at,
        ];
    }
}

<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class OrderItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $primaryImage = null;

        if ($this->relationLoaded('product') && $this->product) {
            $primaryImage =
                $this->product->images
                    ->firstWhere('is_primary', true)
                ?? $this->product->images->first();
        }

        return [
            'id' => $this->id,
            'store_id' => $this->store_id,
            'product_id' => $this->product_id,
            'product_name' => $this->product_name,
            'price' => $this->price,
            'quantity' => $this->quantity,
            'subtotal' => $this->subtotal,

            'image' => $primaryImage
                ? Storage::url($primaryImage->path)
                : null,
        ];
    }
}
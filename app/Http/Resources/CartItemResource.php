<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CartItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $primaryImage = $this->product->images
            ->firstWhere('is_primary', true)
            ?? $this->product->images->first();

        return [
            'id' => $this->id,
            'quantity' => $this->quantity,

            'product' => [
                'id' => $this->product->id,
                'name' => $this->product->name,
                'slug' => $this->product->slug,
                'price' => $this->product->price,
                'stock' => $this->product->stock,
                'is_active' => $this->product->is_active,

                'image' => $primaryImage
                    ? url(\Illuminate\Support\Facades\Storage::url(
                        $primaryImage->path
                    ))
                    : null,
            ],
        ];
    }
}
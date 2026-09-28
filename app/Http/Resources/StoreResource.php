<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class StoreResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'logo' => $this->logo
                ? url(Storage::url($this->logo))
                : null,
            'is_active' => $this->is_active,
            'products' => ProductResource::collection(
                $this->whenLoaded('products')
            ),
            'created_at' => $this->created_at,
        ];
    }
}
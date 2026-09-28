<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'total' => $this->total,

            'buyer_name' => $this->buyer_name,
            'buyer_email' => $this->buyer_email,
            'buyer_phone' => $this->buyer_phone,

            'shipping_postal_code' => $this->shipping_postal_code,
            'shipping_city' => $this->shipping_city,
            'shipping_address' => $this->shipping_address,

            'buyer_received_at' => $this->buyer_received_at,
            'buyer_rejected_at' => $this->buyer_rejected_at,

            'created_at' => $this->created_at,

            'items' => OrderItemResource::collection(
                $this->whenLoaded('items')
            ),

            'seller_groups' => OrderSellerGroupResource::collection(
                $this->whenLoaded('sellerGroups')
            ),
        ];
    }
}
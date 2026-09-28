<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderSellerGroupResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_id' => $this->order_id,
            'store_id' => $this->store_id,

            'status' => $this->status,

            'total' => $this->total,

            'buyer_confirmation_status' =>
                $this->buyer_confirmation_status,

            'buyer_confirmation_deadline_at' =>
                $this->buyer_confirmation_deadline_at,

            'buyer_confirmed_at' =>
                $this->buyer_confirmed_at,

            'buyer_rejected_at' =>
                $this->buyer_rejected_at,

            'store' => $this->whenLoaded(
                'store',
                fn () => [
                    'id' => $this->store->id,
                    'name' => $this->store->name,
                    'slug' => $this->store->slug,
                    'logo' => $this->store->logo,
                ]
            ),

            'refund' => $this->whenLoaded(
                'refund',
                fn () => $this->refund
                    ? [
                        'id' => $this->refund->id,
                        'amount' => $this->refund->amount,
                        'status' => $this->refund->status,
                        'requested_at' => $this->refund->requested_at,
                        'completed_at' => $this->refund->completed_at,
                    ]
                    : null
            ),
        ];
    }
}
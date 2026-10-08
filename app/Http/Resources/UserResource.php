<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'avatar_url' => $this->avatar_url,
            /*
             * A compact store summary so the UI can tell whether the seller
             * already has a store. Loaded on demand to avoid a query on every
             * /me call for buyers and admins.
             */
            'store' => $this->when(
                $this->role === 'seller',
                function () {
                    $store = $this->store;

                    return $store
                        ? [
                            'id' => $store->id,
                            'name' => $store->name,
                            'slug' => $store->slug,
                        ]
                        : null;
                }
            ),
            'created_at' => $this->created_at,
        ];
    }
}
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
             * Capabilities are what the UI should key off. We keep the raw role
             * for admin screens, but the storefront never asks the user to pick
             * a "side": every non-admin account can buy, and any of them can
             * start selling simply by opening a store.
             */
            'can_sell' => $this->role !== 'admin',
            'is_admin' => $this->role === 'admin',
            /*
             * A compact store summary so the UI can tell whether the account
             * already has a store. Loaded on demand to avoid a query on every
             * /me call.
             */
            'store' => $this->when(
                $this->role !== 'admin',
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
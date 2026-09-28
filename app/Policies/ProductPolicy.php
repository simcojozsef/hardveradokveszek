<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\Store;
use App\Models\User;

class ProductPolicy
{
    public function create(User $user, Store $store): bool
    {
        return $user->isAdmin() ||
            ($user->isSeller() && $store->user_id === $user->id);
    }

    public function update(User $user, Product $product): bool
    {
        return $user->isAdmin() ||
            ($user->isSeller() && $product->store->user_id === $user->id);
    }

    public function delete(User $user, Product $product): bool
    {
        return $user->isAdmin() ||
            ($user->isSeller() && $product->store->user_id === $user->id);
    }
}
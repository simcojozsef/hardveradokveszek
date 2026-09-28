<?php

namespace App\Policies;

use App\Models\Store;
use App\Models\User;

class StorePolicy
{
    public function create(User $user): bool
    {
        return $user->isSeller() && !$user->store()->exists();
    }

    public function update(User $user, Store $store): bool
    {
        return $user->isAdmin() || (
            $user->isSeller() &&
            $store->user_id === $user->id
        );
    }

    public function delete(User $user, Store $store): bool
    {
        return $user->isAdmin() || (
            $user->isSeller() &&
            $store->user_id === $user->id
        );
    }
}
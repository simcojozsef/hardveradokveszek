<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Facades\Hash;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'email', 'password', 'role', 'provider', 'provider_id', 'avatar_url', 'two_factor_code', 'two_factor_expires_at', 'two_factor_attempts', 'pro_entitled_until', 'plan_migration_grace_until', 'stripe_customer_id'])]
#[Hidden(['password', 'remember_token', 'two_factor_code', 'two_factor_expires_at', 'two_factor_attempts'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_expires_at' => 'datetime',
            'two_factor_attempts' => 'integer',
            'pro_entitled_until' => 'datetime',
            'plan_migration_grace_until' => 'datetime',
        ];
    }

    public function isBuyer(): bool
    {
        return $this->role === 'buyer';
    }

    public function isSeller(): bool
    {
        return $this->role === 'seller';
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function store(): HasOne
    {
        return $this->hasOne(Store::class);
    }
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
    public function cartItems(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }
    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class);
    }
    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class);
    }

    /*
    |--------------------------------------------------------------------------
    | Subscription
    |--------------------------------------------------------------------------
    */

    /**
     * The seller's subscription row, if any. At most one live/pending row is
     * expected; historical rows remain for auditing.
     */
    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function proEntitledUntil(): ?\Carbon\CarbonInterface
    {
        return $this->pro_entitled_until;
    }

    /** Billing identity used to prefill the next checkout. */
    public function billingProfile(): HasOne
    {
        return $this->hasOne(BillingProfile::class);
    }

    /*
    |--------------------------------------------------------------------------
    | Two-factor (email OTP)
    |--------------------------------------------------------------------------
    */

    /**
     * Whether this account must pass an email OTP before it is fully signed in.
     *
     * Password accounts are always challenged; a Google-only account has no
     * password to protect and is verified by Google instead.
     */
    public function requiresTwoFactor(): bool
    {
        return $this->provider === null && $this->hasVerifiedEmail();
    }

    /**
     * Store a freshly generated OTP (hashed) with its expiry, and reset the
     * wrong-code counter.
     */
    public function issueTwoFactorCode(string $plainCode, int $minutes = 10): void
    {
        $this->forceFill([
            'two_factor_code' => Hash::make($plainCode),
            'two_factor_expires_at' => now()->addMinutes($minutes),
            'two_factor_attempts' => 0,
        ])->save();
    }

    /**
     * Check a submitted code against the stored hash and expiry.
     */
    public function verifyTwoFactorCode(string $plainCode): bool
    {
        if (!$this->two_factor_code || !$this->two_factor_expires_at) {
            return false;
        }

        if ($this->two_factor_expires_at->isPast()) {
            return false;
        }

        return Hash::check($plainCode, $this->two_factor_code);
    }

    /**
     * Clear the OTP once it has been used, so it cannot be replayed.
     */
    public function clearTwoFactorCode(): void
    {
        $this->forceFill([
            'two_factor_code' => null,
            'two_factor_expires_at' => null,
            'two_factor_attempts' => 0,
        ])->save();
    }
}

<?php

namespace App\Services;

use App\Models\User;

/*
 * Single source of truth for what a plan may do.
 *
 * Every gate (publish, image upload, renewal, import, bulk edit) reads its
 * limits from here, so a limit can never drift between controllers. Nothing
 * in a request may raise these values: callers pass a user, never a plan.
 */
class PlanService
{
    public const FREE = 'free';

    public const PRO = 'pro';

    /**
     * The full plan matrix.
     *
     * Values mirror the approved product spec:
     *   free: 10 active listings, 6 photos, 30 days
     *   pro:  100 active listings, 12 photos, 60 days, plus the listed features
     */
    private const PLANS = [
        self::FREE => [
            'name' => 'Ingyenes',
            'price_huf' => 0,
            'max_active_listings' => 10,
            'max_photos_per_listing' => 6,
            'listing_validity_days' => 30,
            'bulk_renewal' => false,
            'bulk_price_stock' => false,
            'import_rows' => 0,
            'store_profile_extras' => false,
            'advanced_stats' => false,
            'bumps_per_period' => 0,
        ],
        self::PRO => [
            'name' => 'PRO',
            'price_huf' => 4990,
            'max_active_listings' => 100,
            'max_photos_per_listing' => 12,
            'listing_validity_days' => 60,
            'bulk_renewal' => true,
            'bulk_price_stock' => true,
            'import_rows' => 50,
            'store_profile_extras' => true,
            'advanced_stats' => true,
            'bumps_per_period' => 5,
        ],
    ];

    /** The plan a user is entitled to right now. */
    public function currentPlan(User $user): string
    {
        return $this->isPro($user) ? self::PRO : self::FREE;
    }

    /**
     * A PRO entitlement exists only while a paid period is still in the future.
     * The stored expiry is authoritative: no Stripe status alone grants access.
     */
    public function isPro(User $user): bool
    {
        $until = $user->pro_entitled_until;

        return $until !== null && $until->isFuture();
    }

    /** @return array<string, mixed> */
    public function limits(User $user): array
    {
        return self::PLANS[$this->currentPlan($user)];
    }

    public function limitFor(User $user, string $key): mixed
    {
        return $this->limits($user)[$key] ?? null;
    }

    public function maxActiveListings(User $user): int
    {
        return (int) $this->limitFor($user, 'max_active_listings');
    }

    public function maxPhotosPerListing(User $user): int
    {
        return (int) $this->limitFor($user, 'max_photos_per_listing');
    }

    public function listingValidityDays(User $user): int
    {
        return (int) $this->limitFor($user, 'listing_validity_days');
    }

    public function can(User $user, string $feature): bool
    {
        return (bool) ($this->limitFor($user, $feature) ?? false);
    }

    /**
     * The whole bundle a seller's own UI needs, so the frontend never has to
     * infer limits or entitlement.
     *
     * @return array<string, mixed>
     */
    public function summaryFor(User $user): array
    {
        $plan = $this->currentPlan($user);
        $limits = $this->limits($user);

        return [
            'plan' => $plan,
            'plan_name' => $limits['name'],
            'is_pro' => $plan === self::PRO,
            'pro_entitled_until' => $user->pro_entitled_until?->toIso8601String(),
            'pro_price_huf' => self::PLANS[self::PRO]['price_huf'],
            'free_price_huf' => self::PLANS[self::FREE]['price_huf'],
            'limits' => [
                'max_active_listings' => $limits['max_active_listings'],
                'max_photos_per_listing' => $limits['max_photos_per_listing'],
                'listing_validity_days' => $limits['listing_validity_days'],
                'import_rows' => $limits['import_rows'],
                'bumps_per_period' => $limits['bumps_per_period'],
            ],
            'features' => [
                'bulk_renewal' => $limits['bulk_renewal'],
                'bulk_price_stock' => $limits['bulk_price_stock'],
                'store_profile_extras' => $limits['store_profile_extras'],
                'advanced_stats' => $limits['advanced_stats'],
            ],
            'usage' => [
                'active_listings' => $this->activeListingCount($user),
            ],
        ];
    }

    /**
     * Counts what actually consumes a slot: published, not sold, not archived,
     * not expired and still in stock.
     */
    public function activeListingCount(User $user): int
    {
        $store = $user->store;

        if (!$store) {
            return 0;
        }

        return $store->products()
            ->where('is_active', true)
            ->where('stock', '>', 0)
            ->whereIn('listing_status', [
                \App\Models\Product::AVAILABLE,
                \App\Models\Product::IN_PROGRESS,
            ])
            ->where('expires_at', '>', now())
            ->count();
    }

    public function hasActiveListingRoom(User $user, int $incoming = 1): bool
    {
        return $this->activeListingCount($user) + $incoming
            <= $this->maxActiveListings($user);
    }
}

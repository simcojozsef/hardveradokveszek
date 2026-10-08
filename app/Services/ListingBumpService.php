<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Subscription;
use App\Models\SubscriptionPeriod;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/*
 * Pre-reservation ("előresorolás").
 *
 * One bump moves one of the seller's own active listings to the front of the
 * default listing order for 24 hours. It is explicitly NOT a guaranteed first
 * place and NOT a fixed multi-day highlight: newer listings push past it.
 *
 * Rules enforced here, all inside one seller lock so concurrency cannot
 * overspend the allowance:
 *  - only a seller's own, currently active listing may be bumped
 *  - the same listing may not be bumped twice within 24 hours, from ANY
 *    source (plan allowance or a purchased credit)
 *  - the plan allowance comes from the paid period: 5 per period, no
 *    carry-over, no calendar reset, no double credit
 *  - a successful operation consumes one allowance; a rejected, failed or
 *    repeated request consumes nothing
 */
class ListingBumpService
{
    /** Hours during which the same listing may not be bumped again. */
    public const COOLDOWN_HOURS = 24;

    public function __construct(
        private readonly PlanService $plans,
        private readonly ListingLimitService $limits,
    ) {
    }

    /**
     * Bump one of the seller's listings using the plan allowance.
     *
     * @return array{product_id:int, bumped_at:string, remaining:int}
     *
     * @throws ValidationException
     */
    public function bump(User $user, Product $product): array
    {
        return $this->limits->withSellerLock($user, function (User $locked) use ($product) {
            $fresh = Product::query()
                ->whereKey($product->id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->assertOwnership($locked, $fresh);
            $this->assertActive($fresh);
            $this->assertCooldown($fresh);

            $period = $this->currentPeriod($locked);

            if (!$period) {
                throw ValidationException::withMessages([
                    'plan' => 'Nincs aktív PRO időszakod, ezért nincs előresorolási kereted.',
                ]);
            }

            if ($period->bumpsRemaining() <= 0) {
                throw ValidationException::withMessages([
                    'plan' => 'Elhasználtad az időszakra járó előresorolásokat.',
                ]);
            }

            /*
             * The bump timestamp and the allowance deduction commit together:
             * a failure after the timestamp write must not leave a free bump.
             */
            $bumpedAt = now();

            DB::transaction(function () use ($fresh, $period, $bumpedAt) {
                Product::whereKey($fresh->id)->update([
                    'bumped_at' => $bumpedAt,
                    'updated_at' => $bumpedAt,
                ]);

                // Conditional increment: only spends a credit if one remains.
                $affected = SubscriptionPeriod::query()
                    ->whereKey($period->id)
                    ->whereColumn('bumps_used', '<', 'bumps_granted')
                    ->increment('bumps_used');

                if ($affected === 0) {
                    throw ValidationException::withMessages([
                        'plan' => 'Elhasználtad az időszakra járó előresorolásokat.',
                    ]);
                }
            });

            return [
                'product_id' => $fresh->id,
                'bumped_at' => $bumpedAt->toIso8601String(),
                'remaining' => $period->fresh()->bumpsRemaining(),
            ];
        });
    }

    /**
     * The paid period the allowance belongs to.
     *
     * The current subscription is resolved from the subscription table, so the
     * allowance always ties to a real paid period rather than a status flag.
     */
    public function currentPeriod(User $user): ?SubscriptionPeriod
    {
        $subscription = Subscription::query()
            ->where('user_id', $user->id)
            ->whereIn('status', Subscription::ACTIVE_STATUSES)
            ->latest('id')
            ->first();

        if (!$subscription) {
            return null;
        }

        return SubscriptionPeriod::query()
            ->where('subscription_id', $subscription->id)
            // The period that covers now, or the most recent one.
            ->where('period_end', '>=', now())
            ->latest('period_end')
            ->first()
            ?? SubscriptionPeriod::where('subscription_id', $subscription->id)
                ->latest('period_end')
                ->first();
    }

    /** Remaining allowance for the UI, without consuming anything. */
    public function remaining(User $user): int
    {
        if (!$this->plans->isPro($user)) {
            return 0;
        }

        return $this->currentPeriod($user)?->bumpsRemaining() ?? 0;
    }

    /**
     * Whether a listing may be bumped right now.
     *
     * @return array{allowed:bool, reason:?string, next_allowed_at:?string}
     */
    public function eligibility(User $user, Product $product): array
    {
        if ($this->plans->isPro($user) === false) {
            return ['allowed' => false, 'reason' => 'not_pro', 'next_allowed_at' => null];
        }

        if ($this->remaining($user) <= 0) {
            return ['allowed' => false, 'reason' => 'no_credits', 'next_allowed_at' => null];
        }

        $cooldownEnd = $this->cooldownEnd($product);

        if ($cooldownEnd) {
            return [
                'allowed' => false,
                'reason' => 'cooldown',
                'next_allowed_at' => $cooldownEnd->toIso8601String(),
            ];
        }

        return ['allowed' => true, 'reason' => null, 'next_allowed_at' => null];
    }

    private function cooldownEnd(Product $product): ?\Illuminate\Support\Carbon
    {
        if (!$product->bumped_at) {
            return null;
        }

        $end = $product->bumped_at->copy()->addHours(self::COOLDOWN_HOURS);

        return $end->isFuture() ? $end : null;
    }

    private function assertOwnership(User $user, Product $product): void
    {
        if ((int) $product->store?->user_id !== (int) $user->id) {
            throw ValidationException::withMessages([
                'product' => 'Ez a hirdetés nem a te terméked.',
            ]);
        }
    }

    private function assertActive(Product $product): void
    {
        if (!$this->limits->consumesSlot($product)) {
            throw ValidationException::withMessages([
                'product' => 'Csak aktív hirdetés sorolható előre.',
            ]);
        }
    }

    private function assertCooldown(Product $product): void
    {
        $cooldownEnd = $this->cooldownEnd($product);

        if ($cooldownEnd) {
            throw ValidationException::withMessages([
                'product' => sprintf(
                    'Ezt a hirdetést %s előtt nem lehet újra előresorolni.',
                    $cooldownEnd->format('Y-m-d H:i')
                ),
            ]);
        }
    }
}

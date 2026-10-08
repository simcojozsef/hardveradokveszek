<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductView;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/*
 * Counts product views without collecting personal data.
 *
 * Privacy by design:
 *  - the guest identifier is a hash of a short-lived first-party session
 *    token, never an IP address. The session token expires, so the hash stops
 *    identifying anything rather than becoming a permanent pseudonym.
 *  - no device fingerprinting: no user agent, screen size or canvas data is
 *    read or stored.
 *  - a signed-in viewer is identified by their user id alone.
 *
 * Deduplication: one counted view per viewer per product per rolling 24-hour
 * bucket, enforced by a unique index rather than a read-then-write check.
 */
class ViewTrackingService
{
    /** Length of a counting window, in hours. */
    private const WINDOW_HOURS = 24;

    /**
     * Record a view, ignoring the ones that must not count.
     *
     * @return bool whether a new view was counted
     */
    public function track(Product $product, ?User $viewer, ?string $sessionToken): bool
    {
        // The seller looking at their own listing never counts.
        if ($viewer && $this->isOwner($product, $viewer)) {
            return false;
        }

        $viewerHash = $viewer
            ? null
            : $this->hashSession($sessionToken);

        /*
         * Without a reliable identifier we cannot deduplicate honestly, so no
         * view is recorded rather than inflating the count with page loads.
         */
        if (!$viewer && $viewerHash === null) {
            return false;
        }

        $now = now();
        $bucket = $this->bucket($now);

        try {
            ProductView::create([
                'product_id' => $product->id,
                'user_id' => $viewer?->id,
                'viewer_hash' => $viewerHash,
                'viewed_at' => $now,
                // Budapest day, so daily grouping needs no query-time maths.
                'viewed_on' => $now->copy()->setTimezone('Europe/Budapest')->toDateString(),
                'bucket' => $bucket,
            ]);
        } catch (\Illuminate\Database\UniqueConstraintViolationException) {
            // Same viewer, same product, same 24h window: already counted.
            return false;
        }

        return true;
    }

    /**
     * The rolling 24-hour bucket a moment falls into.
     *
     * Flooring the timestamp to a 24-hour grid gives a stable key that the
     * unique index can enforce, without storing a per-viewer expiry.
     */
    private function bucket(Carbon $at): int
    {
        return (int) floor($at->timestamp / (self::WINDOW_HOURS * 3600));
    }

    /** A short-lived session token hashed. Null when there is nothing to hash. */
    private function hashSession(?string $sessionToken): ?string
    {
        if (!$sessionToken || strlen($sessionToken) < 16) {
            return null;
        }

        /*
         * Salted with the app key so the hash is not portable across
         * deployments and cannot be matched against an external dataset.
         */
        return hash_hmac('sha256', $sessionToken, (string) config('app.key'));
    }

    private function isOwner(Product $product, User $viewer): bool
    {
        return (int) $product->store?->user_id === (int) $viewer->id;
    }

    /** Total counted views for a product, all time. */
    public function totalFor(Product $product): int
    {
        return ProductView::where('product_id', $product->id)->count();
    }

    /**
     * Daily series for a product between two dates.
     *
     * Reads the daily rollup, so a long range does not scan raw events.
     *
     * @return array<int, array{day:string, views:int}>
     */
    public function dailySeries(Product $product, Carbon $from, Carbon $to): array
    {
        return DB::table('daily_product_stats')
            ->where('product_id', $product->id)
            ->whereBetween('day', [$from->toDateString(), $to->toDateString()])
            ->orderBy('day')
            ->get(['day', 'views'])
            ->map(fn ($row) => ['day' => $row->day, 'views' => (int) $row->views])
            ->all();
    }
}

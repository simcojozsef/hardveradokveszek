<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StoreConversation;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/*
 * Seller-facing statistics.
 *
 * The plan decides what is visible, not what is collected:
 *  - free : total views per listing
 *  - PRO  : the same, plus a 7/30/90-day (or custom range) view series and
 *           the count of new interested conversations
 *
 * The detailed series is recorded for every plan, so upgrading does not start
 * from an empty history. Only access is gated.
 *
 * "Interested conversation" is the spec's definition: the first successfully
 * sent message that is not the seller's, in a conversation for that product.
 * Opening an empty conversation does not count, and one buyer + seller +
 * product combination counts once even if several conversations exist.
 */
class StoreStatisticsService
{
    /** The longest range a single request may ask for. */
    public const MAX_RANGE_DAYS = 365;

    /** Ranges offered in the UI, in days. */
    public const PRESET_RANGES = [7, 30, 90];

    public function __construct(
        private readonly PlanService $plans,
        private readonly ViewTrackingService $views,
    ) {
    }

    /**
     * Per-listing totals. Available on every plan.
     *
     * @return array<int, array<string, mixed>>
     */
    public function listingTotals(User $user): array
    {
        $store = $user->store;

        if (!$store) {
            return [];
        }

        $totals = DB::table('product_views')
            ->join('products', 'product_views.product_id', '=', 'products.id')
            ->where('products.store_id', $store->id)
            ->whereNull('products.deleted_at')
            ->groupBy('products.id', 'products.name')
            ->select([
                'products.id',
                'products.name',
                DB::raw('COUNT(*) as views'),
            ])
            ->orderByDesc('views')
            ->get();

        $conversations = $this->interestedConversationCounts($store->id);

        return $totals->map(fn ($row) => [
            'product_id' => $row->id,
            'name' => $row->name,
            'views' => (int) $row->views,
            // Only ever a real number; no invented data when there is none.
            'interested_conversations' => $conversations[$row->id] ?? 0,
        ])->all();
    }

    /**
     * PRO-only reporting: totals, a series and the range it covers.
     *
     * @return array<string, mixed>
     */
    public function advanced(User $user, ?int $days = null, ?string $from = null, ?string $to = null): array
    {
        $range = $this->resolveRange($days, $from, $to);

        $store = $user->store;

        if (!$store) {
            return [
                'range' => $range,
                'total_views' => 0,
                'series' => [],
                'interested_conversations' => 0,
            ];
        }

        $series = DB::table('daily_product_stats')
            ->where('store_id', $store->id)
            ->whereBetween('day', [$range['from'], $range['to']])
            ->groupBy('day')
            ->orderBy('day')
            ->select(['day', DB::raw('SUM(views) as views')])
            ->get()
            ->map(fn ($row) => ['day' => $row->day, 'views' => (int) $row->views])
            ->all();

        $totalViews = array_sum(array_column($series, 'views'));

        /*
         * A conversation counts when it has at least one message from someone
         * other than the seller, and the range filter uses the date of that
         * first message. One buyer + seller + product counts once.
         */
        $conversations = $this->interestedConversationsInRange($store->id, $range);

        return [
            'range' => $range,
            'total_views' => $totalViews,
            'series' => $series,
            'interested_conversations' => $conversations,
            'listing_totals' => $this->listingTotals($user),
        ];
    }

    /**
     * Whether the seller may see the detailed series.
     */
    public function hasAdvancedAccess(User $user): bool
    {
        return $this->plans->can($user, 'advanced_stats');
    }

    /**
     * @return array{from:string, to:string, days:int, preset:?int}
     */
    private function resolveRange(?int $days, ?string $from, ?string $to): array
    {
        $today = now()->setTimezone('Europe/Budapest')->startOfDay();

        // A custom range wins when both ends are supplied.
        if ($from && $to) {
            $start = Carbon::parse($from)->startOfDay();
            $end = Carbon::parse($to)->startOfDay();

            if ($end->lessThan($start)) {
                [$start, $end] = [$end, $start];
            }

            // Bounded so one request cannot ask for an unbounded scan.
            if ($start->diffInDays($end) > self::MAX_RANGE_DAYS) {
                $start = $end->copy()->subDays(self::MAX_RANGE_DAYS);
            }

            return [
                'from' => $start->toDateString(),
                'to' => $end->toDateString(),
                'days' => (int) $start->diffInDays($end) + 1,
                'preset' => null,
            ];
        }

        $preset = in_array($days, self::PRESET_RANGES, true) ? $days : 30;

        return [
            'from' => $today->copy()->subDays($preset - 1)->toDateString(),
            'to' => $today->toDateString(),
            'days' => $preset,
            'preset' => $preset,
        ];
    }

    /**
     * Product id => interested conversation count, all time.
     *
     * An "interested" conversation is one that actually carries a message from
     * someone who is NOT the seller. Comparing against the seller's user id is
     * what makes an empty conversation, or one where only the seller wrote,
     * count as zero.
     *
     * @return array<int, int>
     */
    private function interestedConversationCounts(int $storeId): array
    {
        /*
         * Counted from the distinct buyer + product pairs that have a message
         * from the buyer side. Grouping by the pair is what makes several
         * conversations between the same two parties count once.
         */
        return DB::table('store_conversations')
            ->join('stores', 'store_conversations.store_id', '=', 'stores.id')
            ->join('store_messages', 'store_messages.conversation_id', '=', 'store_conversations.id')
            ->where('store_conversations.store_id', $storeId)
            ->whereNotNull('store_conversations.buyer_id')
            // A message NOT written by the store's owner is a real enquiry.
            ->whereColumn('store_messages.sender_id', '!=', 'stores.user_id')
            ->groupBy('store_conversations.product_id')
            ->select([
                'store_conversations.product_id',
                DB::raw('COUNT(DISTINCT store_conversations.buyer_id) as interested'),
            ])
            ->pluck('interested', 'product_id')
            ->map(fn ($count) => (int) $count)
            ->all();
    }

    /**
     * Interested conversations whose FIRST buyer message falls in the range.
     *
     * @param  array{from:string, to:string}  $range
     */
    private function interestedConversationsInRange(int $storeId, array $range): int
    {
        $sellerId = DB::table('stores')->where('id', $storeId)->value('user_id');

        $firstMessages = DB::table('store_messages')
            ->join('store_conversations', 'store_messages.conversation_id', '=', 'store_conversations.id')
            ->where('store_conversations.store_id', $storeId)
            ->whereNotNull('store_conversations.buyer_id')
            // The seller's own messages are not an enquiry.
            ->where('store_messages.sender_id', '!=', $sellerId)
            ->groupBy('store_conversations.buyer_id', 'store_conversations.product_id')
            ->select([
                'store_conversations.buyer_id',
                'store_conversations.product_id',
                DB::raw('MIN(store_messages.created_at) as first_message_at'),
            ]);

        return DB::query()
            ->fromSub($firstMessages, 'first_messages')
            ->whereBetween('first_message_at', [
                $range['from'] . ' 00:00:00',
                $range['to'] . ' 23:59:59',
            ])
            ->count();
    }

    /** Convenience for a single product, used by the product statistics view. */
    public function forProduct(User $user, Product $product): array
    {
        return [
            'product_id' => $product->id,
            'total_views' => $this->views->totalFor($product),
            'is_owner' => (int) $product->store?->user_id === (int) $user->id,
        ];
    }
}

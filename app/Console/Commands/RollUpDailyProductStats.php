<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/*
 * Materialises the per-product daily view counts.
 *
 * The rollup is idempotent: a day is recomputed from the raw events and
 * upserted, so re-running or backfilling never doubles a count. The raw rows
 * stay as the audit trail.
 *
 * Days are grouped in Budapest time, because that is the calendar a seller
 * means by "yesterday".
 */
class RollUpDailyProductStats extends Command
{
    protected $signature = 'stats:rollup {--days=2 : How many past days to recompute}';

    protected $description = 'Roll product views into daily per-product statistics';

    public function handle(): int
    {
        $timezone = 'Europe/Budapest';
        $days = max(1, (int) $this->option('days'));
        $written = 0;

        for ($offset = 0; $offset < $days; $offset++) {
            $day = Carbon::now($timezone)->subDays($offset)->toDateString();

            /*
             * Count the raw events whose Budapest day matches, keeping only
             * rows for products that still exist.
             */
            $rows = DB::table('product_views')
                ->join('products', 'product_views.product_id', '=', 'products.id')
                ->whereDate('product_views.viewed_on', $day)
                ->whereNull('products.deleted_at')
                ->groupBy('products.id', 'products.store_id')
                ->select([
                    'products.id as product_id',
                    'products.store_id',
                    DB::raw('COUNT(*) as views'),
                ])
                ->get();

            foreach ($rows as $row) {
                DB::table('daily_product_stats')->upsert(
                    [[
                        'product_id' => $row->product_id,
                        'store_id' => $row->store_id,
                        'day' => $day,
                        'views' => (int) $row->views,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]],
                    ['product_id', 'day'],
                    ['views', 'updated_at']
                );

                $written++;
            }
        }

        $this->info("Napi statisztika sorok irva: {$written}");

        return self::SUCCESS;
    }
}

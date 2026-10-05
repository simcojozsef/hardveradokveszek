<?php

namespace App\Console\Commands;

use App\Services\ProductListingLifecycle;
use Illuminate\Console\Command;

class ExpireProductListings extends Command
{
    protected $signature = 'products:expire';
    protected $description = 'Mark product listings expired when their 60-day window ends';

    public function handle(ProductListingLifecycle $lifecycle): int
    {
        $count = $lifecycle->expireDue();
        $this->info("Lejárt termékek száma: {$count}");
        return self::SUCCESS;
    }
}

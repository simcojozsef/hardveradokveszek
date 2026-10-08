<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('orders:expire-buyer-confirmations')->hourly();
Schedule::command('products:expire')->everyMinute()->withoutOverlapping();
// Flags listings entering their final 3 days; one notice per window.
Schedule::command('products:warn-expiring')->hourly()->withoutOverlapping();
// Safety net for missed Stripe webhooks; idempotent, so overlap is harmless
// but pointless.
Schedule::command('stripe:reconcile')->hourly()->withoutOverlapping();
// Ends lapsed PRO periods and rebalances their listings down to the free cap.
Schedule::command('plans:expire-pro')->everyTenMinutes()->withoutOverlapping();
// Materialises the daily view counts. Recomputes the last two days so a late
// or missed run self-heals.
Schedule::command('stats:rollup')->hourly()->withoutOverlapping();

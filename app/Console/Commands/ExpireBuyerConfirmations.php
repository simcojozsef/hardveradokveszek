<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Models\OrderSellerGroup;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ExpireBuyerConfirmations extends Command
{
    protected $signature = 'orders:expire-buyer-confirmations';

    protected $description =
        'Automatically complete shipped orders when the buyer confirmation period expires.';

    public function handle(): int
    {
        $groups = OrderSellerGroup::query()
            ->where('status', 'shipped')
            ->where('buyer_confirmation_status', 'pending')
            ->whereNotNull('buyer_confirmation_deadline_at')
            ->where(
                'buyer_confirmation_deadline_at',
                '<=',
                now()
            )
            ->get();

        foreach ($groups as $group) {
            DB::transaction(function () use ($group) {
                $group->update([
                    'status' => 'completed',
                    'buyer_confirmation_status' => 'expired',
                ]);

                $this->refreshParentOrderStatus(
                    $group->order_id
                );
            });
        }

        $this->info(
            "{$groups->count()} buyer confirmation(s) expired."
        );

        return self::SUCCESS;
    }

    private function refreshParentOrderStatus(int $orderId): void
    {
        $statuses = OrderSellerGroup::query()
            ->where('order_id', $orderId)
            ->pluck('status');

        if ($statuses->isEmpty()) {
            return;
        }

        $orderStatus = 'pending';

        if (
            $statuses->every(
                fn ($status) => $status === 'completed'
            )
        ) {
            $orderStatus = 'completed';
        } elseif (
            $statuses->contains('shipped')
        ) {
            $orderStatus = 'shipped';
        } elseif (
            $statuses->contains('processing')
        ) {
            $orderStatus = 'processing';
        }

        Order::whereKey($orderId)->update([
            'status' => $orderStatus,
        ]);
    }
}
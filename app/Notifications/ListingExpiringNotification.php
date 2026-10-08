<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/*
 * Reminds a seller that a listing expires in three days.
 *
 * Raised once per validity window by the expiry-warning command, so a repeated
 * scheduler run cannot queue the same notice twice. Renewing clears the marker,
 * which is what lets the next window warn again.
 */
class ListingExpiringNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly int $expiringCount,
        public readonly ?string $nextExpiry = null,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('GigaPiac – hamarosan lejáró hirdetéseid')
            ->greeting('Szia ' . $notifiable->name . '!')
            ->line($this->expiringCount . ' hirdetésed 3 napon belül lejár.')
            ->when(
                $this->nextExpiry,
                fn ($m) => $m->line('A legközelebbi lejárat: ' . $this->nextExpiry . '.')
            )
            ->line(
                'A lejárt hirdetés nem jelenik meg a keresésben, de nem törlődik. '
                . 'A megújítással újra aktívvá teheted.'
            )
            ->action('Hirdetéseim megújítása', url('/seller/products'))
            ->salutation('Üdvözlettel, a GigaPiac csapata');
    }
}

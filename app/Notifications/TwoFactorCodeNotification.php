<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/*
 * The 6-digit code emailed as the second factor on password login.
 *
 * Queued: the mail API must never delay the login response, since the user
 * is waiting on the code screen.
 */
class TwoFactorCodeNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly string $code,
        public readonly int $expiresInMinutes = 10,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('GigaPiac – bejelentkezési kód')
            ->greeting('Szia ' . $notifiable->name . '!')
            ->line('A bejelentkezés befejezéséhez írd be az alábbi kódot:')
            ->line('')
            ->line('# ' . $this->code)
            ->line('')
            ->line(
                'A kód ' . $this->expiresInMinutes . ' percig érvényes. '
                . 'Ha nem te próbáltál bejelentkezni, hagyd figyelmen kívül ezt a levelet, '
                . 'és javasoljuk, hogy változtasd meg a jelszavad.'
            )
            ->salutation('Üdvözlettel, a GigaPiac csapata');
    }
}

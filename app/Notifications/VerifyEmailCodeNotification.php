<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/*
 * Sent right after registration to prove the address is real.
 *
 * This is the main anti-spam gate: an automated signup cannot read the inbox,
 * so it cannot finish verification. Sent synchronously (no queue worker).
 */
class VerifyEmailCodeNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $code,
        public readonly int $expiresInMinutes = 60,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('GigaPiac – e-mail cím megerősítése')
            ->greeting('Üdv a GigaPiac piactéren, ' . $notifiable->name . '!')
            ->line('A fiók aktiválásához írd be az alábbi kódot:')
            ->line('')
            ->line('# ' . $this->code)
            ->line('')
            ->line(
                'A kód ' . $this->expiresInMinutes . ' percig érvényes. '
                . 'Ha nem te regisztráltál, hagyd figyelmen kívül ezt a levelet.'
            )
            ->salutation('Üdvözlettel, a GigaPiac csapata');
    }
}

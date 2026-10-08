<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/*
 * The seller-facing subscription notices.
 *
 * One class with a type switch rather than seven near-identical files: the
 * lifecycle wording belongs together, and a new event is one more branch.
 *
 * Sent on the transactional stream through the existing Laravel mail setup,
 * queued so a slow provider cannot block the request that triggered it.
 */
class SubscriptionNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public const ACTIVATED = 'activated';

    public const RENEWED = 'renewed';

    public const PAYMENT_FAILED = 'payment_failed';

    public const ACTION_REQUIRED = 'action_required';

    public const CANCELED = 'canceled';

    public const CANCEL_REVERTED = 'cancel_reverted';

    public const ENDED = 'ended';

    public function __construct(
        public readonly string $type,
        public readonly array $context = [],
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $message = (new MailMessage)
            ->greeting('Szia ' . $notifiable->name . '!');

        return match ($this->type) {
            self::ACTIVATED => $message
                ->subject('GigaPiac – PRO előfizetésed aktív')
                ->line('Sikeresen elindult a PRO előfizetésed.')
                ->line('Érvényes eddig: ' . $this->formatDate('entitled_until'))
                ->line('Aktív hirdetés: ' . $this->value('max_active_listings', 100)
                    . ' · Fotó hirdetésenként: ' . $this->value('max_photos_per_listing', 12)
                    . ' · Érvényesség: ' . $this->value('listing_validity_days', 60) . ' nap')
                ->line('Az időszakra járó előresorolás: ' . $this->value('bumps_per_period', 5))
                ->action('Előfizetés kezelése', url('/seller/subscription'))
                ->salutation('Üdvözlettel, a GigaPiac csapata'),

            self::RENEWED => $message
                ->subject('GigaPiac – PRO előfizetésed megújult')
                ->line('A havi előfizetésed megújult, a PRO szolgáltatások továbbra is aktívak.')
                ->line('Érvényes eddig: ' . $this->formatDate('entitled_until'))
                ->line('Az új időszakra ' . $this->value('bumps_per_period', 5)
                    . ' előresorolás jár.')
                ->action('Előfizetés kezelése', url('/seller/subscription'))
                ->salutation('Üdvözlettel, a GigaPiac csapata'),

            self::PAYMENT_FAILED => $message
                ->subject('GigaPiac – a PRO előfizetés fizetése nem sikerült')
                ->line('A havi előfizetésed megújításakor a fizetés nem sikerült.')
                ->line('A PRO szolgáltatásaid a már kifizetett időszak végéig '
                    . 'elérhetők maradnak.')
                ->line('Kérjük, ellenőrizd a fizetési adataidat.')
                ->action('Fizetési adatok kezelése', url('/seller/subscription'))
                ->salutation('Üdvözlettel, a GigaPiac csapata'),

            self::ACTION_REQUIRED => $message
                ->subject('GigaPiac – fizetési megerősítés szükséges')
                ->line('A bankod további megerősítést kér a havi előfizetésed teljesítéséhez.')
                ->line('A PRO szolgáltatásaid a már kifizetett időszak végéig '
                    . 'elérhetők maradnak.')
                ->action('Fizetés megerősítése', url('/seller/subscription'))
                ->salutation('Üdvözlettel, a GigaPiac csapata'),

            self::CANCELED => $message
                ->subject('GigaPiac – PRO előfizetésed lemondva')
                ->line('Az előfizetésed automatikus megújulását lemondtad.')
                ->line('A PRO szolgáltatásaid ' . $this->formatDate('entitled_until')
                    . ' napig még elérhetők.')
                ->line('Ha meggondolod magad, az időszak végéig visszavonhatod.')
                ->action('Előfizetés kezelése', url('/seller/subscription'))
                ->salutation('Üdvözlettel, a GigaPiac csapata'),

            self::CANCEL_REVERTED => $message
                ->subject('GigaPiac – a lemondást visszavontad')
                ->line('Az előfizetésed ismét automatikusan megújul.')
                ->action('Előfizetés kezelése', url('/seller/subscription'))
                ->salutation('Üdvözlettel, a GigaPiac csapata'),

            self::ENDED => $message
                ->subject('GigaPiac – a PRO előfizetésed lejárt')
                ->line('A fizetett időszakod lejárt, ezért a fiókod az ingyenes '
                    . 'csomagra váltott.')
                ->line('Ingyenes csomagban legfeljebb '
                    . $this->value('kept', 10) . ' hirdetés marad aktív.')
                ->when(
                    $this->value('archived', 0) > 0,
                    fn ($m) => $m->line('Archivált hirdetések: '
                        . $this->value('archived', 0)
                        . ' — ezek nem törlődtek, bármikor újraaktiválhatók.')
                )
                ->line('A hirdetéseid és a beszélgetéseid megmaradtak.')
                ->action('Hirdetéseim', url('/seller/products'))
                ->salutation('Üdvözlettel, a GigaPiac csapata'),

            default => $message->subject('GigaPiac értesítés'),
        };
    }

    private function value(string $key, mixed $default = null): mixed
    {
        return $this->context[$key] ?? $default;
    }

    private function formatDate(string $key): string
    {
        $value = $this->context[$key] ?? null;

        if (!$value) {
            return '—';
        }

        return \Illuminate\Support\Carbon::parse($value)
            ->timezone('Europe/Budapest')
            ->format('Y. m. d.');
    }
}

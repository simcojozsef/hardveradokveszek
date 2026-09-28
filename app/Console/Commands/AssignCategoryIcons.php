<?php

namespace App\Console\Commands;

use App\Models\Category;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class AssignCategoryIcons extends Command
{
    protected $signature = 'categories:assign-icons';

    protected $description =
        'Automatikusan hozzárendeli az icon_key értékeket a kategóriákhoz.';

    public function handle(): int
    {
        $categories = Category::query()
            ->orderBy('id')
            ->get();

        $updated = 0;
        $skipped = 0;

        foreach ($categories as $category) {
            $iconKey = $this->resolveIconKey(
                $category->name
            );

            if (!$iconKey) {
                $skipped++;

                $this->line(
                    "Nincs megfelelő ikon: {$category->name}"
                );

                continue;
            }

            if (
                $category->icon_key ===
                $iconKey
            ) {
                continue;
            }

            $category->update([
                'icon_key' => $iconKey,
            ]);

            $updated++;

            $this->info(
                "{$category->name} → {$iconKey}"
            );
        }

        $this->newLine();

        $this->info(
            "Kész. Frissítve: {$updated}, kihagyva: {$skipped}."
        );

        return self::SUCCESS;
    }

    private function resolveIconKey(
        string $name
    ): ?string {
        $value = Str::lower(
            Str::ascii($name)
        );

        /*
        |--------------------------------------------------------------------------
        | Very specific matches first
        |--------------------------------------------------------------------------
        */

        $specific = [
            'alaplap' => 'motherboard',

            'processzor' => 'cpu',
            'cpu' => 'cpu',

            'memoria' => 'ram',
            'ram' => 'ram',
            'ddr3' => 'ram',
            'ddr4' => 'ram',
            'ddr5' => 'ram',

            'videokartya' => 'gpu',
            'gpu' => 'gpu',
            'geforce' => 'gpu',
            'radeon' => 'gpu',
            'rx ' => 'gpu',
            'rtx ' => 'gpu',

            'ssd' => 'ssd',
            'nvme' => 'ssd',

            'hdd' => 'hdd',
            'merevlemez' => 'hdd',

            'monitor' => 'monitor',

            'notebook' => 'laptop',
            'laptop' => 'laptop',

            'pc' => 'desktop-pc',
            'asztali szamitogep' => 'desktop-pc',

            'mini pc' => 'mini-pc',

            'szerver rack' => 'server-rack',
            'rack szerver' => 'server-rack',
            'szerver' => 'server',

            'nas' => 'nas',

            'router' => 'router',
            'gateway' => 'router',

            'switch' => 'switch',

            'access point' => 'access-point',
            'hozzaferesi pont' => 'access-point',

            'billentyuzet' => 'keyboard',
            'eger' => 'mouse',

            'egeralatet' => 'mousepad',
            'mousepad' => 'mousepad',

            'gamepad' => 'gamepad',
            'kontroller' => 'gamepad',

            'jatekvezerlo' => 'gamepad',

            'joystick' => 'joystick',

            'verseny kormany' => 'racing-wheel',
            'racing wheel' => 'racing-wheel',
            'kormany' => 'racing-wheel',

            'vr' => 'vr-headset',
            'vr headset' => 'vr-headset',

            'webkamera' => 'webcam',
            'webcam' => 'webcam',

            'mikrofon' => 'microphone',
            'fejhallgato' => 'headphones',
            'headset' => 'headphones',

            'hangszoro' => 'speakers',
            'hangfal' => 'speakers',

            'soundbar' => 'soundbar',

            'erosito' => 'amplifier',
            'erosito' => 'amplifier',
            'amplifier' => 'amplifier',

            'dac' => 'dac',
            'd a c' => 'dac',

            'lemezjatszo' => 'turntable',
            'bakelit' => 'turntable',
            'turntable' => 'turntable',

            'tv' => 'tv',
            'televizio' => 'tv',

            'projektor' => 'projector',

            'media lejatszo' => 'media-player',
            'media player' => 'media-player',

            'radio' => 'radio',
            'dab' => 'dab-radio',

            'fényképező' => 'camera',
            'fenykepezo' => 'camera',
            'fenykepezogep' => 'camera',
            'kamera' => 'camera',

            'dslr' => 'dslr',
            'tukorreflexes' => 'dslr',

            'milc' => 'mirrorless',
            'tukor nelkuli' => 'mirrorless',
            'mirrorless' => 'mirrorless',

            'videokamera' => 'video-camera',
            'videokamera' => 'video-camera',

            'objektiv' => 'lens',
            'objektivek' => 'lens',

            'dron' => 'drone',
            'drone' => 'drone',

            'gimbal' => 'gimbal',
            'stabilizator' => 'gimbal',

            'tripod' => 'tripod',
            'allvany' => 'tripod',

            'vaku' => 'flash',
            'flash' => 'flash',

            'akciokamera' => 'action-camera',
            'action camera' => 'action-camera',

            'okostelefon' => 'smartphone',
            'smartphone' => 'smartphone',
            'telefon' => 'smartphone',

            'iphone' => 'iphone',
            'android' => 'android-phone',

            'tablet' => 'tablet',

            'okosora' => 'smartwatch',
            'smartwatch' => 'smartwatch',

            'okosgyuru' => 'smart-ring',
            'smart ring' => 'smart-ring',

            'ebook' => 'ebook-reader',
            'e-book' => 'ebook-reader',
            'e-olvaso' => 'ebook-reader',

            'sim kartya' => 'sim-card',
            'sim' => 'sim-card',

            'powerbank' => 'power-bank',
            'power bank' => 'power-bank',

            'tolto' => 'charger',
            'toltok' => 'charger',
            'charger' => 'charger',

            'kabel' => 'cable',
            'kabelek' => 'cable',

            'szoftver' => 'software',
            'software' => 'software',

            'jatek' => 'game',
            'jatekok' => 'game',

            'playstation' => 'playstation',
            'ps5' => 'playstation',
            'ps4' => 'playstation',

            'xbox' => 'xbox',

            'nintendo' => 'nintendo',
        ];

        foreach ($specific as $needle => $iconKey) {
            if (
                $value === $needle ||
                Str::startsWith(
                    $value,
                    $needle
                ) ||
                Str::contains(
                    $value,
                    ' ' . $needle
                )
            ) {
                return $iconKey;
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Generic keyword fallback
        |--------------------------------------------------------------------------
        */

        $keywords = [
            'alaplap' => 'motherboard',
            'laplap' => 'motherboard',

            'processzor' => 'cpu',
            'intel' => 'cpu',
            'amd' => 'cpu',
            'socket' => 'cpu',
            'lga' => 'cpu',

            'memoria' => 'ram',
            'dimm' => 'ram',

            'gpu' => 'gpu',
            'videokartya' => 'gpu',
            'graphics' => 'gpu',
            'geforce' => 'gpu',
            'radeon' => 'gpu',

            'ssd' => 'ssd',
            'nvme' => 'ssd',

            'hdd' => 'hdd',
            'merevlemez' => 'hdd',

            'monitor' => 'monitor',

            'laptop' => 'laptop',
            'notebook' => 'laptop',

            'szerver' => 'server',
            'server' => 'server',

            'router' => 'router',
            'switch' => 'switch',
            'halozat' => 'router',

            'billentyuzet' => 'keyboard',
            'keyboard' => 'keyboard',

            'eger' => 'mouse',
            'mouse' => 'mouse',

            'jatek' => 'game',
            'game' => 'game',
            'playstation' => 'playstation',
            'xbox' => 'xbox',
            'nintendo' => 'nintendo',

            'telefon' => 'smartphone',
            'mobil' => 'smartphone',
            'iphone' => 'iphone',
            'android' => 'android-phone',

            'tablet' => 'tablet',

            'ora' => 'smartwatch',
            'okosora' => 'smartwatch',

            'kamera' => 'camera',
            'fenykepezo' => 'camera',
            'foto' => 'camera',

            'dron' => 'drone',

            'tv' => 'tv',
            'radio' => 'radio',
            'projektor' => 'projector',

            'mikrofon' => 'microphone',
            'fejhallgato' => 'headphones',
            'hang' => 'speakers',
            'hangszoro' => 'speakers',

            'kabel' => 'cable',
            'tolto' => 'charger',
        ];

        foreach ($keywords as $keyword => $iconKey) {
            if (Str::contains(
                $value,
                $keyword
            )) {
                return $iconKey;
            }
        }

        return null;
    }
}
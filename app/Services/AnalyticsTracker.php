<?php

namespace App\Services;

use App\Models\AnalyticsEvent;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AnalyticsTracker
{
    public function track(
        string $event,
        ?Model $subject = null,
        ?string $visitorId = null,
        ?string $pageUrl = null,
        ?Request $request = null,
    ): AnalyticsEvent {
        $request ??= request();

        return AnalyticsEvent::create([
            'user_id' => $request->user()?->id,

            'event' => $event,

            'url' => $pageUrl,

            'subject_type' =>
                $subject?->getMorphClass(),

            'subject_id' =>
                $subject?->getKey(),

            'visitor_id' => $visitorId,

            'ip_address' =>
                $request->ip(),

            'user_agent' =>
                $request->userAgent(),
        ]);
    }
}
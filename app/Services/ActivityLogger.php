<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ActivityLogger
{
    public function log(
        string $action,
        string $description,
        ?Model $subject = null,
        array $metadata = [],
        ?Request $request = null,
    ): ActivityLog {
        $request ??= request();

        $user = $request->user();

        return ActivityLog::create([
            'user_id' => $user?->id,

            'action' => $action,

            'subject_type' =>
                $subject?->getMorphClass(),

            'subject_id' =>
                $subject?->getKey(),

            'description' => $description,

            'metadata' => $metadata,

            'ip_address' =>
                $request->ip(),

            'user_agent' =>
                $request->userAgent(),
        ]);
    }
}
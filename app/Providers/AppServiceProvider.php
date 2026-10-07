<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Http\Request;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiting();
    }

    /**
     * Throttles for the credential endpoints.
     *
     * Laravel's throttle middleware takes ``name:maxAttempts,decayMinutes``.
     */
    protected function configureRateLimiting(): void
    {
        // Login: per email + IP, so one attacker cannot lock everyone out and
        // a leaked list of emails cannot be brute-forced in parallel.
        RateLimiter::for('login', function (Request $request) {
            $email = Str::lower((string) $request->input('email'));

            return [
                Limit::perMinute(5)->by('login:' . $email . '|' . $request->ip()),
            ];
        });

        // Registration: slow down bulk account creation from one IP.
        RateLimiter::for('register', function (Request $request) {
            return Limit::perHour(5)->by('register:' . $request->ip());
        });

        // The emailed codes: a tight window so they cannot be brute-forced.
        RateLimiter::for('otp', function (Request $request) {
            return [
                Limit::perMinute(6)->by('otp:' . $request->ip()),
                Limit::perDay(30)->by('otp-day:' . $request->ip()),
            ];
        });

        // Re-sending a code is itself an abuse vector (mail flooding).
        RateLimiter::for('otp-resend', function (Request $request) {
            return Limit::perMinute(1)->by('otp-resend:' . $request->ip());
        });
    }
}

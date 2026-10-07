<?php

use App\Http\Controllers\Auth\SocialAuthController;
use Illuminate\Support\Facades\Route;

/*
 * Social login lives in the web group: it is a full-page redirect to the
 * provider and back, and it needs the session that the SPA then reuses.
 */
Route::get('/auth/{provider}/redirect', [SocialAuthController::class, 'redirect'])
    ->whereIn('provider', ['google'])
    ->name('social.redirect');

Route::get('/auth/{provider}/callback', [SocialAuthController::class, 'callback'])
    ->whereIn('provider', ['google'])
    ->name('social.callback');

Route::get('/{any?}', function () {
    return view('app');
})->where('any', '.*');
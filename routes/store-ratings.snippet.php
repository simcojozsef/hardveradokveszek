<?php
// Add this import alongside your other controller imports in routes/api.php:
use App\Http\Controllers\Api\StoreRatingController;

// Add this public route outside your auth:sanctum group:
Route::get('/stores/{store}/ratings', [StoreRatingController::class, 'show']);

// Add these INSIDE your existing auth:sanctum -> role:buyer group:
Route::get('/stores/{store}/my-rating', [StoreRatingController::class, 'mine']);
Route::put('/stores/{store}/rating', [StoreRatingController::class, 'update'])
    ->middleware('throttle:30,1');

<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductImageController;
use App\Http\Controllers\Api\StoreController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\BuyerOrderController;
use App\Http\Controllers\Api\BuyerCartController;
use App\Http\Controllers\Api\BuyerCheckoutController;
use App\Http\Controllers\Api\SellerOrderController;
use App\Http\Controllers\Api\BuyerRefundController;
use App\Http\Controllers\Api\SellerRefundController;
use App\Http\Controllers\Api\AdminDashboardController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AdminActivityLogController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AdminAnalyticsController;
use App\Http\Controllers\Api\AdminCategoryController;
use App\Http\Controllers\Api\CategoryController;

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

Route::middleware('web')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
});

/*
|--------------------------------------------------------------------------
| Authenticated API
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);

    /*
    |--------------------------------------------------------------------------
    | Seller
    |--------------------------------------------------------------------------
    */

    Route::middleware('role:seller')->group(function () {
        // Seller dashboard
        Route::get('/my/store', [StoreController::class, 'mine']);
        Route::get('/my/products', [ProductController::class, 'mine']);

        // Store management
        Route::post('/stores', [StoreController::class, 'store']);

        Route::patch(
            '/stores/{store}',
            [StoreController::class, 'update']
        );

        Route::delete(
            '/stores/{store}',
            [StoreController::class, 'destroy']
        );

        // Product management
        Route::post(
            '/stores/{store}/products',
            [ProductController::class, 'store']
        );

        Route::patch(
            '/products/{product}',
            [ProductController::class, 'update']
        );
        Route::patch(
            '/my/store',
            [StoreController::class, 'updateMine']
        );

        Route::delete(
            '/products/{product}',
            [ProductController::class, 'destroy']
        );

        // Product images
        Route::post(
            '/products/{product}/images',
            [ProductImageController::class, 'store']
        );

        Route::patch(
            '/product-images/{productImage}',
            [ProductImageController::class, 'update']
        );

        Route::delete(
            '/product-images/{productImage}',
            [ProductImageController::class, 'destroy']
        );

        Route::post(
            '/my/store/logo',
            [StoreController::class, 'uploadLogo']
        );

        Route::delete(
            '/my/store/logo',
            [StoreController::class, 'deleteLogo']
        );

        Route::get(
            '/my/seller-orders',
            [SellerOrderController::class, 'index']
        );

        Route::get(
            '/my/seller-orders/{orderSellerGroup}',
            [SellerOrderController::class, 'show']
        );

        Route::patch(
            '/my/seller-orders/{orderSellerGroup}/status',
            [SellerOrderController::class, 'updateStatus']
        );
        Route::get(
            '/my/refunds/{refund}',
            [SellerRefundController::class, 'show']
        );

        Route::post(
            '/my/refunds/{refund}/complete',
            [SellerRefundController::class, 'complete']
        );
    });


        /*
    |--------------------------------------------------------------------------
    | Buyer
    |--------------------------------------------------------------------------
    */

    Route::middleware('role:buyer')->group(function () {
        Route::get(
            '/my/orders',
            [BuyerOrderController::class, 'index']
        );

        Route::get(
            '/my/orders/{order}',
            [BuyerOrderController::class, 'show']
        );

        Route::post(
            '/my/orders/{orderSellerGroup}/receipt',
            [BuyerOrderController::class, 'receipt']
        );

        Route::get(
            '/my/cart',
            [BuyerCartController::class, 'index']
        );

        Route::post(
            '/my/cart/products/{product}',
            [BuyerCartController::class, 'store']
        );

        Route::patch(
            '/my/cart/{cartItem}',
            [BuyerCartController::class, 'update']
        );

        Route::delete(
            '/my/cart/{cartItem}',
            [BuyerCartController::class, 'destroy']
        );

        Route::delete(
            '/my/cart',
            [BuyerCartController::class, 'clear']
        );

        Route::post(
            '/my/checkout',
            [BuyerCheckoutController::class, 'store']
        );
        Route::post(
            '/my/seller-orders/{orderSellerGroup}/refund',
            [BuyerRefundController::class, 'store']
        );
        Route::get(
            '/my/refunds/{refund}/proof',
            [BuyerRefundController::class, 'proof']
        );
    });

    /*
    |--------------------------------------------------------------------------
    | Admin
    |--------------------------------------------------------------------------
    */

    Route::middleware('role:admin')
    ->prefix('admin')
    ->group(function () {
        Route::get(
            '/dashboard',
            [AdminDashboardController::class, 'index']
        );

        Route::get(
            '/users',
            [AdminController::class, 'users']
        );

        Route::get(
            '/stores',
            [AdminController::class, 'stores']
        );

        Route::get(
            '/products',
            [AdminController::class, 'products']
        );

        Route::get(
            '/orders',
            [AdminController::class, 'orders']
        );

        Route::get(
            '/refunds',
            [AdminController::class, 'refunds']
        );
        Route::get(
            '/logs',
            [AdminActivityLogController::class, 'index']
        );
        Route::get(
            '/analytics',
            [AdminAnalyticsController::class, 'index']
        );
        Route::get(
            '/categories',
            [AdminCategoryController::class, 'index']
        );

        Route::post(
            '/categories',
            [AdminCategoryController::class, 'store']
        );

        Route::patch(
            '/categories/{category}',
            [AdminCategoryController::class, 'update']
        );

        Route::delete(
            '/categories/{category}',
            [AdminCategoryController::class, 'destroy']
        );

        Route::post(
            '/categories/{category}/icon',
            [AdminCategoryController::class, 'uploadIcon']
        );

        Route::delete(
            '/categories/{category}/icon',
            [AdminCategoryController::class, 'deleteIcon']
        );
    });

});

/*
|--------------------------------------------------------------------------
| Public storefront API
|--------------------------------------------------------------------------
*/

Route::get(
    '/stores/{store}',
    [StoreController::class, 'show']
);

Route::get(
    '/stores/{store}/products',
    [ProductController::class, 'index']
);

Route::get(
    '/products',
    [ProductController::class, 'marketplace']
);

Route::get(
    '/products/{product}',
    [ProductController::class, 'show']
);
Route::get(
    '/products/{product}/images',
    [ProductImageController::class, 'index']
);

Route::post(
    '/analytics/track',
    [AnalyticsController::class, 'track']
);

Route::get(
    '/categories',
    [CategoryController::class, 'index']
);

Route::get(
    '/categories/{path}',
    [CategoryController::class, 'show']
)->where('path', '.*');
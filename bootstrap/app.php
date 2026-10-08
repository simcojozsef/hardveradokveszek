<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();

        $middleware->alias([
            'role' => \App\Http\Middleware\RoleMiddleware::class,
        ]);

        /*
         * Runs on both groups: the web group serves the SPA, and the api
         * group answers /api/storefront, which is where the SPA asks whether
         * it is on a store subdomain. It only ever sets a request attribute;
         * nothing is blocked, so the normal routes keep working.
         */
        $middleware->appendToGroup('web', \App\Http\Middleware\ResolveStoreSubdomain::class);
        $middleware->appendToGroup('api', \App\Http\Middleware\ResolveStoreSubdomain::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();

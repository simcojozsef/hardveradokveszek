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
            'block.store.auth' => \App\Http\Middleware\BlockStoreSubdomainAuth::class,
        ]);

        /*
         * The auth block must run before the store resolver: a login attempt
         * on a store subdomain is refused outright, so there is no reason to
         * load the store first. Prepending on both groups also keeps the guard
         * effective even if the stores table is unavailable, and covers the
         * social routes that live in the web group.
         */
        $middleware->prependToGroup('api', \App\Http\Middleware\BlockStoreSubdomainAuth::class);
        $middleware->prependToGroup('web', \App\Http\Middleware\BlockStoreSubdomainAuth::class);

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

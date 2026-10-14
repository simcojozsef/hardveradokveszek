<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/*
 * Blocks authentication from a store subdomain.
 *
 * Accounts are shared across every store and belong to the marketplace apex
 * domain. A visitor on pcbolt.gigapiac.hu must not log in, register or manage
 * sessions there; the frontend only shows a notice, but that is a hint, not a
 * guarantee. This middleware is the actual rule: every auth mutation from a
 * store host is refused here, so a crafted request cannot bypass the UI.
 *
 * Only mutating auth endpoints are guarded. Reading the current session
 * (/api/me) stays allowed so a signed-in visitor browsing a store subdomain
 * keeps their navbar; they just cannot change the session from there.
 */
class BlockStoreSubdomainAuth
{
    /** Auth endpoints that must never run on a store subdomain. */
    private const BLOCKED = [
        'auth/login',
        'auth/register',
        'auth/logout',
        'auth/email/verify',
        'auth/email/resend',
        'auth/two-factor/challenge',
        'auth/two-factor/resend',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if ($this->isStoreSubdomain($request) && $this->isBlockedPath($request)) {
            return response()->json([
                'message' => 'Bejelentkezés és regisztráció csak a gigapiac.hu oldalon lehetséges.',
            ], 403);
        }

        return $next($request);
    }

    /**
     * Whether the request host is a store subdomain.
     *
     * Delegates to ResolveStoreSubdomain so both middlewares share the exact
     * same host rules. It only needs the host shape: the block must hold even
     * for a store whose PRO plan lapsed, so it does not depend on the store
     * being loaded or active.
     */
    private function isStoreSubdomain(Request $request): bool
    {
        return ResolveStoreSubdomain::subdomain($request->getHost()) !== null;
    }

    private function isBlockedPath(Request $request): bool
    {
        // Routes live under the "api/" prefix; the rules below are written
        // without it, so strip it first or nothing would ever match.
        $path = ltrim($request->path(), '/');

        if (str_starts_with($path, 'api/')) {
            $path = substr($path, 4);
        }

        foreach (self::BLOCKED as $blocked) {
            if ($path === $blocked) {
                return true;
            }
        }

        // Social login is a full-page provider redirect, not an /auth/* mutation.
        if (preg_match('#^auth/[^/]+/(redirect|callback)$#', $path) === 1) {
            return true;
        }

        return false;
    }
}

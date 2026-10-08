<?php

namespace App\Http\Middleware;

use App\Models\Store;
use App\Services\PlanService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/*
 * Resolves a store from the request host.
 *
 * A store slug becomes a subdomain: pcbolt.gigapiac.hu. This middleware
 * detects the subdomain, loads the store and exposes it to the rest of the
 * request, so the SPA can render the storefront at "/" instead of the
 * marketplace home.
 *
 * Rules enforced here:
 *  - the apex domain (gigapiac.hu) and reserved hostnames carry no store
 *  - the subdomain only serves a store whose owner has an ACTIVE PRO period;
 *    a free plan keeps the /store/<slug> path but no public subdomain
 *  - an unknown or inactive subdomain is treated as no store, and the app
 *    falls back to its normal routing
 */
class ResolveStoreSubdomain
{
    /** Hosts that must never resolve to a store. */
    private const NON_STORE_HOSTS = ['www', 'api', 'admin', 'app'];

    public function handle(Request $request, Closure $next): Response
    {
        $store = $this->resolve($request);

        if ($store) {
            // Shared with the whole request; the API reads it back.
            $request->attributes->set('store', $store);
        }

        return $next($request);
    }

    public function resolve(Request $request): ?Store
    {
        $slug = $this->subdomain($request->getHost());

        if ($slug === null) {
            return null;
        }

        $store = Store::query()
            ->where('slug', $slug)
            ->where('is_active', true)
            ->first();

        if (!$store) {
            return null;
        }

        /*
         * The subdomain is a PRO feature. A free-plan store is still reachable
         * on /store/<slug>, but its branded subdomain is not live yet, so the
         * request falls through rather than serving a half-branded storefront.
         */
        $owner = $store->user;

        if (!$owner || !app(PlanService::class)->isPro($owner)) {
            return null;
        }

        return $store;
    }

    /**
     * The subdomain label, or null when this is the apex domain.
     *
     * Works for both production (pcbolt.gigapiac.hu) and local development
     * (pcbolt.localhost), where the apex is a bare hostname.
     */
    private function subdomain(string $host): ?string
    {
        $host = strtolower($host);
        $apex = strtolower((string) config('app.domain', 'localhost'));

        // Exact apex: no subdomain.
        if ($host === $apex || $host === 'localhost' || $host === '127.0.0.1') {
            return null;
        }

        // Must end with ".<apex>" to be a store subdomain of ours.
        if (!str_ends_with($host, '.' . $apex)) {
            return null;
        }

        $label = substr($host, 0, -(strlen($apex) + 1));

        // A nested label (a.b.apex) is not a store slug.
        if ($label === '' || str_contains($label, '.')) {
            return null;
        }

        if (in_array($label, self::NON_STORE_HOSTS, true)) {
            return null;
        }

        return $label;
    }
}

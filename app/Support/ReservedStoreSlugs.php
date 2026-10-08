<?php

namespace App\Support;

/*
 * Store slugs that may never be claimed.
 *
 * A slug becomes a subdomain (pcbolt.gigapiac.hu), so anything that could be
 * mistaken for a platform service, or that could hijack our own hostnames,
 * has to be refused. Without this a seller could claim admin.gigapiac.hu or
 * api.gigapiac.hu and impersonate the platform.
 */
class ReservedStoreSlugs
{
    /** Exact matches, refused outright. */
    private const RESERVED = [
        // Platform hostnames and infrastructure.
        'www', 'api', 'admin', 'app', 'mail', 'email', 'smtp', 'imap', 'pop',
        'static', 'assets', 'cdn', 'img', 'images', 'media', 'files',
        'ns', 'ns1', 'ns2', 'dns', 'mx', 'ftp', 'ssh', 'vpn',
        'staging', 'dev', 'test', 'testing', 'demo', 'beta', 'alpha',
        'localhost', 'internal', 'intranet', 'private',

        // Application areas that already have routes.
        'seller', 'buyer', 'store', 'stores', 'product', 'products',
        'category', 'categories', 'marketplace', 'search', 'account',
        'auth', 'login', 'register', 'logout', 'password', 'checkout',
        'cart', 'orders', 'order', 'invoice', 'invoices', 'billing',
        'subscription', 'subscriptions', 'import', 'settings', 'profile',
        'dashboard', 'messages', 'chat', 'notifications',

        // Support and content surfaces.
        'support', 'help', 'status', 'blog', 'news', 'about', 'contact',
        'legal', 'terms', 'privacy', 'gdpr', 'aszf', 'adatkezeles',
        'docs', 'documentation', 'faq', 'careers', 'jobs', 'partners',

        // Things that read as official or misleading.
        'gigapiac', 'official', 'system', 'root', 'security', 'abuse',
        'postmaster', 'webmaster', 'hostmaster', 'noreply', 'no-reply',
    ];

    /** Prefixes that are refused because they imply a platform service. */
    private const RESERVED_PREFIXES = [
        'admin', 'api-', 'www-', 'mail-', 'test-', 'dev-', 'stage-',
    ];

    public static function isReserved(string $slug): bool
    {
        $slug = strtolower(trim($slug));

        if (in_array($slug, self::RESERVED, true)) {
            return true;
        }

        foreach (self::RESERVED_PREFIXES as $prefix) {
            if (str_starts_with($slug, $prefix)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Validation pattern for a legal DNS label.
     *
     * Lowercase letters, digits and inner hyphens only; must not start or end
     * with a hyphen. This is what a subdomain can actually be, so it is
     * enforced rather than merely sanitised.
     */
    public static function pattern(): string
    {
        return '/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/';
    }

    /**
     * The exact-match list, for use in a validation rule.
     *
     * @return array<int, string>
     */
    public static function all(): array
    {
        return self::RESERVED;
    }
}

<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        // The transport reads services.postmark.token; POSTMARK_API_KEY is the
        // name the Laravel skeleton ships with, so both point at one value.
        'token' => env('POSTMARK_API_KEY'),
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
    ],

    'stripe' => [
        'key' => env('STRIPE_KEY'),
        'secret' => env('STRIPE_SECRET'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
        // Pinned so a Stripe-side default change never silently alters webhook payloads.
        'api_version' => env('STRIPE_API_VERSION', '2026-09-30.endive'),

        /*
         * Server-side only: the frontend never sends a price or amount.
         * Empty means the PRO checkout is not configured yet and stays off.
         */
        'pro_price_id' => env('STRIPE_PRO_PRICE_ID'),

        /*
         * One-off pre-reservation credits. Deliberately disabled until the
         * owner sets a price and a Price ID: an unset price must mean "not
         * for sale", never a fallback figure.
         */
        'bump_price_id' => env('STRIPE_BUMP_PRICE_ID'),
        'bump_purchase_enabled' => env('STRIPE_BUMP_PURCHASE_ENABLED', false),
    ],

    'szamlazz' => [
        // Számla Agent key. Empty or disabled means no invoice is issued.
        'agent_key' => env('SZAMLAZZ_AGENT_KEY'),
        'enabled' => env('SZAMLAZZ_ENABLED', false),
        // The agent also offers a separate test mode; off = live documents.
        'use_test' => env('SZAMLAZZ_USE_TEST', false),
        // Legacy credentials, only needed by accounts that still require them.
        'user' => env('SZAMLAZZ_USER'),
        'password' => env('SZAMLAZZ_PASSWORD'),

        /*
         * Issuer (the platform's own company) details. The agent requires
         * these on every document, and the exact tax treatment is an
         * accounting decision, so they come from configuration and must be
         * finalised before live billing.
         */
        'seller' => [
            'name' => env('SZAMLAZZ_SELLER_NAME'),
            'tax_number' => env('SZAMLAZZ_SELLER_TAX_NUMBER'),
            'country' => env('SZAMLAZZ_SELLER_COUNTRY', 'HU'),
            'postal_code' => env('SZAMLAZZ_SELLER_POSTAL_CODE'),
            'city' => env('SZAMLAZZ_SELLER_CITY'),
            'address' => env('SZAMLAZZ_SELLER_ADDRESS'),
            'email' => env('SZAMLAZZ_SELLER_EMAIL'),
            'bank_account' => env('SZAMLAZZ_SELLER_BANK_ACCOUNT'),
        ],

        /* Default VAT rate applied to the PRO subscription line. */
        'vat_rate' => env('SZAMLAZZ_VAT_RATE', 27),

        /*
         * The expected gross PRO price, in forint. Used as a sanity guard: a
         * document whose total is far from this is almost certainly in the
         * wrong unit, and is refused rather than issued.
         */
        'expected_gross_huf' => (int) env('SZAMLAZZ_EXPECTED_GROSS_HUF', 4990),
    ],

];

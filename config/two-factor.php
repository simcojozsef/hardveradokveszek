<?php

/*
 * Two-factor exceptions.
 *
 * A listed account signs in with e-mail and password only; no code is emailed
 * and no challenge screen is shown.
 *
 * The list is configuration rather than code on purpose:
 *  - it can be changed on the server without a deployment
 *  - the exception is visible to whoever administers the environment
 *  - it does not put a personal address in the repository
 *
 * Keep this list as short as possible. Every entry is an account that is
 * protected by its password alone.
 */
return [

    /*
     * E-mail addresses exempt from the emailed second factor.
     *
     * Example:
     *   'exempt_emails' => ['admin@example.com'],
     */
    'exempt_emails' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('TWO_FACTOR_EXEMPT_EMAILS', ''))
    ))),

];

import React from 'react';
import { FiExternalLink, FiLock } from 'react-icons/fi';

import '../../css/subdomain-auth-notice.css';

/*
 * Shown in place of the login/register form when the visitor is on a store
 * subdomain (pcbolt.gigapiac.hu).
 *
 * Accounts are shared across every store, so authentication only happens on
 * the marketplace apex domain. Rather than letting a visitor submit a form
 * that cannot work here, we stop them early and send them to gigapiac.hu.
 *
 * The links are absolute and hard-coded on purpose: a relative "/login" would
 * stay on the subdomain and land right back on this notice.
 */
const MARKETPLACE_ORIGIN = 'https://gigapiac.hu';

export default function SubdomainAuthNotice() {
    return (
        <div className="subdomain-auth-notice">
            <div className="subdomain-auth-notice__icon" aria-hidden="true">
                <FiLock />
            </div>

            <p className="subdomain-auth-notice__message">
                Ön egy előfizető bolt linkjén tartózkodik éppen. Kérjük a{' '}
                <a
                    href={`${MARKETPLACE_ORIGIN}/login`}
                    className="subdomain-auth-notice__link"
                >
                    gigapiac.hu
                </a>{' '}
                weboldalon{' '}
                <a
                    href={`${MARKETPLACE_ORIGIN}/login`}
                    className="subdomain-auth-notice__link"
                >
                    jelentkezzen be
                </a>
                , vagy{' '}
                <a
                    href={`${MARKETPLACE_ORIGIN}/register`}
                    className="subdomain-auth-notice__link"
                >
                    regisztráljon
                </a>
                .
            </p>

            <div className="subdomain-auth-notice__actions">
                <a
                    href={`${MARKETPLACE_ORIGIN}/login`}
                    className="button subdomain-auth-notice__button"
                >
                    <FiExternalLink aria-hidden="true" />
                    <span>Bejelentkezés a gigapiac.hu-n</span>
                </a>

                <a
                    href={`${MARKETPLACE_ORIGIN}/register`}
                    className="secondary-button subdomain-auth-notice__button"
                >
                    <FiExternalLink aria-hidden="true" />
                    <span>Regisztráció a gigapiac.hu-n</span>
                </a>
            </div>
        </div>
    );
}

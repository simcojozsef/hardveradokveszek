import React, { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

import '../../css/reveal-contact.css';

/*
 * Contact detail that stays masked until the visitor asks for it.
 *
 * The full value is never rendered until the click, so a naive scraper
 * reading the page source (or the DOM) does not walk away with the seller's
 * phone number or e-mail address.
 */
function maskPhone(value) {
    const digits = value.replace(/\D/g, '');

    if (digits.length < 4) return '•••• ••••';

    // Keep a friendly shape: last two digits stay visible as a hint.
    const tail = digits.slice(-2);

    return `+36 •• ••• ${tail}••`;
}

function maskEmail(value) {
    const [localPart, domain] = value.split('@');

    if (!domain) return '••••••';

    const visible = localPart.slice(0, 1);

    return `${visible}•••••@${domain}`;
}

export default function RevealContact({
    kind,
    value,
    href,
    label,
}) {
    const [revealed, setRevealed] = useState(false);

    const masked = kind === 'email' ? maskEmail(value) : maskPhone(value);

    function reveal() {
        setRevealed(true);
    }

    if (!revealed) {
        return (
            <button
                type="button"
                className="reveal-contact reveal-contact--hidden"
                onClick={reveal}
                aria-label={`${label} megjelenítése`}
            >
                <span className="reveal-contact__label">{label}</span>

                <span className="reveal-contact__value" aria-hidden="true">
                    {masked}
                </span>

                <span className="reveal-contact__cta">
                    <FiEye aria-hidden="true" />
                    <span>Megjelenítés</span>
                </span>
            </button>
        );
    }

    return (
        <a className="reveal-contact reveal-contact--shown" href={href}>
            <span className="reveal-contact__label">{label}</span>

            <strong className="reveal-contact__value">{value}</strong>

            <span className="reveal-contact__cta reveal-contact__cta--done">
                <FiEyeOff aria-hidden="true" />
                <span>Megjelenítve</span>
            </span>
        </a>
    );
}

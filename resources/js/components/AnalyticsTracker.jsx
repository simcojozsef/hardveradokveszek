import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { trackEvent } from '../api/analytics';

export default function AnalyticsTracker() {
    const location = useLocation();
    const lastTrackedRef = useRef('');

    useEffect(() => {
        const pageUrl =
            location.pathname +
            location.search;

        if (lastTrackedRef.current === pageUrl) {
            return;
        }

        lastTrackedRef.current = pageUrl;

        trackEvent({
            event: 'page_view',
            pageUrl,
        });
    }, [
        location.pathname,
        location.search,
    ]);

    return null;
}
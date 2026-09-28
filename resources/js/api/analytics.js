function getVisitorId() {
    const key = 'hav_visitor_id';

    let visitorId = localStorage.getItem(key);

    if (!visitorId) {
        visitorId = crypto.randomUUID();

        localStorage.setItem(
            key,
            visitorId
        );
    }

    return visitorId;
}

export async function trackEvent({
    event,
    subjectType = null,
    subjectId = null,
    pageUrl = window.location.pathname,
}) {
    try {
        await fetch('/api/analytics/track', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type':
                    'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                event,
                visitor_id: getVisitorId(),
                subject_type: subjectType,
                subject_id: subjectId,
                page_url: pageUrl,
            }),
        });
    } catch {
        // Analytics must never break the application.
    }
}
let pending;
export function getLocations() {
    if (!pending) {
        pending = fetch('/api/locations', { headers: { Accept: 'application/json' } })
            .then(async (response) => {
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'A helyadatokat nem sikerült betölteni.');
                if (!Array.isArray(data.counties) || !Array.isArray(data.settlements)) throw new Error('Hiányos helyadatok.');
                return data;
            }).catch((error) => { pending = undefined; throw error; });
    }
    return pending;
}
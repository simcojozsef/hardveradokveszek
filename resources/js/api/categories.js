export async function getTopCategories() {
    const response = await fetch(
        '/api/categories',
        {
            headers: {
                Accept: 'application/json',
            },
            credentials: 'include',
        }
    );

    if (!response.ok) {
        throw new Error(
            'Nem sikerült betölteni a fő kategóriákat.'
        );
    }

    return response.json();
}

export async function getCategory(path) {
    const response = await fetch(
        `/api/categories/${path}`,
        {
            headers: {
                Accept: 'application/json',
            },
            credentials: 'include',
        }
    );

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error(
                'A kategória nem található.'
            );
        }

        throw new Error(
            'Nem sikerült betölteni a kategóriát.'
        );
    }

    return response.json();
}

export async function getCategoryTree() {
    const response = await fetch(
        '/api/categories',
        {
            headers: {
                Accept: 'application/json',
            },
            credentials: 'include',
        }
    );

    if (!response.ok) {
        throw new Error(
            'Nem sikerült betölteni a kategóriákat.'
        );
    }

    return response.json();
}
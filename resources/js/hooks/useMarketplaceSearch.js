import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { getFilteredProducts } from '../api/filteredProducts';
import { EMPTY_SEARCH_FILTERS, buildMarketplaceParams, parseMarketplaceParams, hasSearchFilters } from '../utils/marketplaceFilters';
import { formatApiError } from '../utils/productFilters';
export default function useMarketplaceSearch({ categoryIds } = {}) {
    const [params, setParams] = useSearchParams();
    const urlQuery = params.toString();
    const applied = useMemo(() => parseMarketplaceParams(new URLSearchParams(urlQuery)), [urlQuery]);
    const pageValue = Number(params.get('page'));
    const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const [search, setSearch] = useState(applied.query);
    const [filters, setFilters] = useState(() => ({ ...EMPTY_SEARCH_FILTERS, ...applied }));
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);
    const scopeKey = categoryIds === null ? null : categoryIds === undefined ? undefined : categoryIds.join(',');
    useEffect(() => {
        setSearch(applied.query);
        setFilters({ ...EMPTY_SEARCH_FILTERS, ...applied });
    }, [applied]);
    useEffect(() => {
        const controller = new AbortController();
        setProducts([]);
        setPagination(null);
        setLoading(true);
        setError('');
        // Category metadata must resolve before any product request is made.
        if (scopeKey === null) return () => controller.abort();
        const scope = scopeKey === undefined ? undefined : scopeKey.split(',').map(Number);
        getFilteredProducts(applied, { page, categoryIds: scope, signal: controller.signal })
            .then((response) => {
                if (controller.signal.aborted) return;
                setProducts(Array.isArray(response.data) ? response.data : []);
                setPagination(response.meta ?? null);
            }).catch((err) => {
                if (!controller.signal.aborted) setError(formatApiError(err));
            }).finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [applied, page, scopeKey, retry]);
    function handleSearch(event, values) {
        event?.preventDefault();
        setParams(buildMarketplaceParams(values ?? { ...filters, query: search }), { replace: true });
        // Resubmitting the same search should still refresh its results.
        setRetry((value) => value + 1);
    }
    function handleClearSearch() {
        setSearch('');
        setFilters({ ...EMPTY_SEARCH_FILTERS });
        setParams(new URLSearchParams(), { replace: true });
        setRetry((value) => value + 1);
    }
    function handlePageChange(nextPage) {
        if (!Number.isSafeInteger(nextPage) || nextPage < 1) return;
        setParams(buildMarketplaceParams(applied, nextPage));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return {
        search, setSearch, filters, setFilters, products, pagination, loading, error, page,
        submittedSearch: applied.query, hasFilters: hasSearchFilters(applied),
        handleSearch, handleClearSearch, handlePageChange,
        retryProducts: () => setRetry((value) => value + 1),
    };
}
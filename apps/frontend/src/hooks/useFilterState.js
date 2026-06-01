import { useSearchParams } from 'react-router-dom';
import { useMemo, useCallback } from 'react';

/**
 * A custom hook to synchronize filter states with the URL search parameters.
 * Supports defaulting, identifying active state, single or multi setting, and clearing.
 *
 * @param {Object} defaultFilters - The default values for each filter key.
 * @param {React.RefObject} searchRef - Optional ref to the search input to focus upon clearing.
 */
export function useFilterState(defaultFilters, searchRef) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse filters from search params or default
  const filters = useMemo(() => {
    const res = {};
    for (const key in defaultFilters) {
      const val = searchParams.get(key);
      if (val !== null) {
        // If the default value was a number, parse it as a number
        if (typeof defaultFilters[key] === 'number') {
          res[key] = isNaN(Number(val)) ? defaultFilters[key] : Number(val);
        } else {
          res[key] = val;
        }
      } else {
        res[key] = defaultFilters[key];
      }
    }
    return res;
  }, [searchParams, defaultFilters]);

  // Check if any active filter differs from its default value
  const hasActiveFilters = useMemo(() => {
    for (const key in defaultFilters) {
      const current = filters[key];
      const defaultValue = defaultFilters[key];
      // Compare as strings to prevent strict mismatch on types stored in URL
      if (String(current) !== String(defaultValue)) {
        return true;
      }
    }
    return false;
  }, [filters, defaultFilters]);

  // Set individual filter
  const setFilter = useCallback((key, value) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (value === undefined || value === null || value === '' || String(value) === String(defaultFilters[key])) {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
      return newParams;
    }, { replace: true });
  }, [setSearchParams, defaultFilters]);

  // Set multiple filters at once
  const setFilters = useCallback((newFilters) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      for (const key in newFilters) {
        const value = newFilters[key];
        if (value === undefined || value === null || value === '' || String(value) === String(defaultFilters[key])) {
          newParams.delete(key);
        } else {
          newParams.set(key, String(value));
        }
      }
      return newParams;
    }, { replace: true });
  }, [setSearchParams, defaultFilters]);

  // Clear all filters to default
  const clearAll = useCallback(() => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      for (const key in defaultFilters) {
        newParams.delete(key);
      }
      return newParams;
    }, { replace: true });
    
    // Focus search input if ref is passed
    if (searchRef?.current) {
      setTimeout(() => {
        searchRef.current.focus();
      }, 50);
    }
  }, [setSearchParams, defaultFilters, searchRef]);

  return {
    filters,
    hasActiveFilters,
    setFilter,
    setFilters,
    clearAll,
  };
}

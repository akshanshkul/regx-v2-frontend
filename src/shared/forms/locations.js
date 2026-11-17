/**
 * Reads of the shared location master data.
 *
 * Deliberately not on the authenticated api instance: a public registration
 * form needs these dropdowns and has no token. Results are cached per level and
 * parent for the life of the page, since the master data does not change while
 * someone is filling in a form and the same country list is asked for by every
 * location field on it.
 */

import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';

const cache = new Map();

const ENDPOINTS = {
    country: (parentId) => ['/locations/countries', {}],
    state: (parentId) => ['/locations/states', { countryId: parentId }],
    district: (parentId) => ['/locations/districts', { stateId: parentId }],
};

/**
 * @param {'country'|'state'|'district'} level
 * @param {string|number|null} parentId  The country for a state, the state for
 *                                       a district; ignored for countries.
 * @returns {Promise<Array<{value: string, label: string}>>}
 */
export const fetchLocations = async (level, parentId = null) => {
    const endpoint = ENDPOINTS[level];

    if (!endpoint) return [];
    if (level !== 'country' && !parentId) return [];

    const key = `${level}:${parentId ?? ''}`;

    if (cache.has(key)) return cache.get(key);

    const [path, params] = endpoint(parentId);

    // The promise itself is cached, so several fields mounting at once share
    // one request rather than each firing their own.
    const request = axios
        .get(`${BASE}${path}`, { params })
        .then((response) => response.data?.data ?? [])
        .catch((error) => {
            cache.delete(key);
            throw error;
        });

    cache.set(key, request);

    return request;
};

/** Drops the cache — used after the master data is edited in the admin screens. */
export const clearLocationCache = () => cache.clear();

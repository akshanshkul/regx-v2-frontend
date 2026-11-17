import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, Crosshair, ExternalLink, X, Loader2 } from 'lucide-react';
import { parseLatLng, parseCoordinates, toMapsUrl } from '../../shared/utils/mapLink';

const DEFAULT_CENTER = [22.9734, 78.6569]; // Centre of India
const DEFAULT_ZOOM = 4;
const PICKED_ZOOM = 16;

// Nominatim asks for no more than one request per second.
const SEARCH_DEBOUNCE_MS = 700;

/**
 * Leaflet ships its default marker icon as image files that bundlers rewrite,
 * which usually ends in a broken image. A DivIcon keeps the pin self-contained.
 */
const pinIcon = L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    html: `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
             style="filter: drop-shadow(0 2px 3px rgba(0,0,0,.35))">
            <path d="M12 23s8-7.1 8-13a8 8 0 1 0-16 0c0 5.9 8 13 8 13z" fill="#EC4D2D" stroke="#fff" stroke-width="1.6"/>
            <circle cx="12" cy="10" r="3" fill="#fff"/>
        </svg>`,
});

/**
 * Drop-a-pin location picker built on Leaflet + OpenStreetMap — no API key and
 * no billing account required.
 *
 * Deliberately does not touch the address / state / PIN fields; it only
 * produces the Maps link, handed back through `onChange`.
 */
const LocationPicker = ({ value, onChange }) => {
    const mapNodeRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const onChangeRef = useRef(onChange);

    // Keep the click handler pointing at the latest onChange without having to
    // tear the map down and rebuild it on every parent render.
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    const [position, setPosition] = useState(() => parseLatLng(value));
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [manualEntry, setManualEntry] = useState(false);

    const commit = (lat, lng) => {
        setPosition({ lat, lng });
        onChangeRef.current(toMapsUrl(lat, lng));
    };

    // --- Build the map once -------------------------------------------------
    useEffect(() => {
        if (manualEntry || !mapNodeRef.current || mapRef.current) return;

        const start = position ? [position.lat, position.lng] : DEFAULT_CENTER;

        const map = L.map(mapNodeRef.current, {
            center: start,
            zoom: position ? PICKED_ZOOM : DEFAULT_ZOOM,
            scrollWheelZoom: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        const marker = L.marker(start, { icon: pinIcon, draggable: true });
        if (position) marker.addTo(map);

        map.on('click', (e) => commit(e.latlng.lat, e.latlng.lng));
        marker.on('dragend', () => {
            const { lat, lng } = marker.getLatLng();
            commit(lat, lng);
        });

        mapRef.current = map;
        markerRef.current = marker;

        // Leaflet measures the container on creation, which is routinely before
        // the layout has settled — it then renders into a 0px-wide box and only
        // paints a couple of tiles. Re-measure whenever the container resizes,
        // which also covers the sidebar collapsing and tab switches.
        const observer = new ResizeObserver(() => map.invalidateSize());
        observer.observe(mapNodeRef.current);

        return () => {
            observer.disconnect();
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
        // Built once; later updates are handled by the effects below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [manualEntry]);

    // --- Follow a value changed elsewhere (e.g. the edit form's fetch) ------
    useEffect(() => {
        const parsed = parseLatLng(value);
        if (!parsed) return;

        setPosition((current) =>
            current && current.lat === parsed.lat && current.lng === parsed.lng ? current : parsed
        );
    }, [value]);

    // --- Keep the marker in step with the picked position -------------------
    useEffect(() => {
        const map = mapRef.current;
        const marker = markerRef.current;
        if (!map || !marker) return;

        if (!position) {
            marker.remove();
            return;
        }

        marker.setLatLng([position.lat, position.lng]).addTo(map);
        map.panTo([position.lat, position.lng]);
    }, [position]);

    // --- Nominatim search (free, no key) ------------------------------------
    useEffect(() => {
        const q = query.trim();

        // A typed coordinate pair needs no lookup service.
        if (parseCoordinates(q)) {
            setResults([]);
            setSearchError(null);
            setIsSearching(false);
            return;
        }

        if (q.length < 3) {
            setResults([]);
            setSearchError(null);
            return;
        }

        const controller = new AbortController();

        const timer = setTimeout(async () => {
            setIsSearching(true);
            setSearchError(null);

            try {
                const params = new URLSearchParams({ format: 'jsonv2', q, limit: '5', addressdetails: '0' });
                const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
                    signal: controller.signal,
                    headers: { Accept: 'application/json' },
                });

                if (!response.ok) throw new Error(`Search failed (${response.status})`);

                setResults(await response.json());
            } catch (e) {
                if (e.name !== 'AbortError') {
                    setResults([]);
                    setSearchError('Could not reach the search service. You can still click the map.');
                }
            } finally {
                setIsSearching(false);
            }
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query]);

    // Set when the user has typed a coordinate pair rather than a place name.
    const typedCoords = parseCoordinates(query);

    const handleUseTypedCoords = () => {
        if (!typedCoords) return;

        mapRef.current?.setView([typedCoords.lat, typedCoords.lng], PICKED_ZOOM);
        commit(typedCoords.lat, typedCoords.lng);
        setQuery('');
    };

    const handleSelectResult = (result) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        mapRef.current?.setView([lat, lng], PICKED_ZOOM);
        commit(lat, lng);

        setQuery('');
        setResults([]);
    };

    const handleUseMyLocation = () => {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                mapRef.current?.setView([latitude, longitude], PICKED_ZOOM);
                commit(latitude, longitude);
            },
            () => {
                // Denied or unavailable — clicking the map still works.
            }
        );
    };

    const handleClear = () => {
        setPosition(null);
        onChange('');
    };

    // --- Plain link entry, for anyone who would rather paste a URL ----------
    if (manualEntry) {
        return (
            <div className="space-y-2">
                <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => {
                        const raw = e.target.value;
                        // Typed coordinates are normalised to a Maps link so the
                        // stored value is the same shape however it was entered.
                        const coords = parseCoordinates(raw);
                        onChange(coords ? toMapsUrl(coords.lat, coords.lng) : raw);
                    }}
                    placeholder="https://maps.app.goo.gl/...  or  25.163185, 79.016053"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                />
                <button
                    type="button"
                    onClick={() => setManualEntry(false)}
                    className="text-xs font-medium text-regx-orange hover:underline"
                >
                    Pick on the map instead
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* Search + actions */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            // Enter would otherwise submit the surrounding form.
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (typedCoords) handleUseTypedCoords();
                            }
                        }}
                        placeholder="Search a place, paste 25.163185, 79.016053, or click the map"
                        className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                    />

                    {isSearching && (
                        <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                    )}

                    {typedCoords && (
                        <div className="absolute z-[1000] left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                            <button
                                type="button"
                                onClick={handleUseTypedCoords}
                                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                                <Crosshair className="w-4 h-4 text-regx-orange shrink-0" />
                                <span>
                                    Drop a pin at{' '}
                                    <span className="font-mono text-xs">
                                        {typedCoords.lat.toFixed(6)}, {typedCoords.lng.toFixed(6)}
                                    </span>
                                </span>
                            </button>
                        </div>
                    )}

                    {!typedCoords && results.length > 0 && (
                        <ul className="absolute z-[1000] left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                            {results.map((result) => (
                                <li key={result.place_id}>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectResult(result)}
                                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-start gap-2"
                                    >
                                        <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                                        <span className="leading-snug">{result.display_name}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <button
                    type="button"
                    onClick={handleUseMyLocation}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shrink-0"
                >
                    <Crosshair className="w-4 h-4 text-gray-400" />
                    Use my location
                </button>
            </div>

            {searchError && <p className="text-xs text-amber-600">{searchError}</p>}

            {/* Map */}
            <div className="relative rounded-xl overflow-hidden border border-gray-300">
                <div ref={mapNodeRef} className="w-full h-64 bg-gray-100 z-0" />

                {!position && (
                    <div className="absolute inset-x-0 bottom-0 z-[400] bg-white/90 backdrop-blur-sm border-t border-gray-200 px-3 py-2 pointer-events-none">
                        <p className="text-xs text-gray-600 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-regx-orange" />
                            Click anywhere on the map to drop a pin.
                        </p>
                    </div>
                )}
            </div>

            {/* Picked value */}
            {position ? (
                <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="w-4 h-4 text-regx-orange shrink-0" />
                        <span className="font-mono text-xs text-gray-700 truncate">
                            {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <a
                            href={toMapsUrl(position.lat, position.lng)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-regx-orange hover:underline flex items-center gap-1"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Open
                        </a>
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-xs font-medium text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                            Clear
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setManualEntry(true)}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700 hover:underline"
                >
                    Paste a Maps link instead
                </button>
            )}
        </div>
    );
};

export default LocationPicker;

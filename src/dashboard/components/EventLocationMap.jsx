import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const ZOOM = 15;

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
 * Read-only map showing where an event is. Dragging and zooming stay available
 * because a fixed map is frustrating, but there is nothing to edit here.
 */
const EventLocationMap = ({ position, className = 'h-44' }) => {
    const nodeRef = useRef(null);
    const mapRef = useRef(null);

    useEffect(() => {
        if (!nodeRef.current || !position || mapRef.current) return;

        const map = L.map(nodeRef.current, {
            center: [position.lat, position.lng],
            zoom: ZOOM,
            scrollWheelZoom: false,
            attributionControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        L.marker([position.lat, position.lng], { icon: pinIcon }).addTo(map);

        // Leaflet measures on creation, usually before the layout has settled,
        // and would otherwise render into a zero-width box.
        const observer = new ResizeObserver(() => map.invalidateSize());
        observer.observe(nodeRef.current);

        mapRef.current = map;

        return () => {
            observer.disconnect();
            map.remove();
            mapRef.current = null;
        };
    }, [position]);

    // Keep the view in step if the event's location changes underneath us.
    useEffect(() => {
        if (mapRef.current && position) {
            mapRef.current.setView([position.lat, position.lng], ZOOM);
        }
    }, [position]);

    if (!position) return null;

    return <div ref={nodeRef} className={`w-full ${className} rounded-lg overflow-hidden z-0`} />;
};

export default EventLocationMap;

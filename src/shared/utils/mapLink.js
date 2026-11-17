/**
 * Helpers for the coordinate pair stored inside an event's map link.
 * Shared by the picker on the event form and the read-only map on the details
 * page, so both agree on what a valid location looks like.
 */

const inRange = (lat, lng) =>
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

export const toMapsUrl = (lat, lng) =>
    `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;

/**
 * Accepts a bare coordinate pair as a user would paste it out of any maps app:
 * "25.163185, 79.016053", "25.163185 79.016053", or with a trailing degree sign.
 */
export const parseCoordinates = (text) => {
    if (!text) return null;

    const match = text
        .trim()
        .replace(/[°\s]+/g, ' ')
        .match(/^(-?\d{1,3}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)$/);

    if (!match) return null;

    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);

    return inRange(lat, lng) ? { lat, lng } : null;
};

/**
 * Reads a lat/lng out of a Maps URL, or straight out of a bare coordinate pair.
 */
export const parseLatLng = (url) => {
    if (!url) return null;

    const bare = parseCoordinates(url);
    if (bare) return bare;

    const match =
        url.match(/[?&]q=(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/) ||
        url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/) ||
        url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);

    if (!match) return null;

    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);

    return inRange(lat, lng) ? { lat, lng } : null;
};

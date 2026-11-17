import React from 'react';

/**
 * Placeholder block used while real content loads.
 *
 * Pass `rounded` rather than putting a rounded-* class in `className` — Tailwind
 * resolves conflicting utilities by stylesheet order, not by string order, so a
 * rounding class in `className` would not reliably win.
 */
const Skeleton = ({ className = '', rounded = 'rounded-md' }) => (
    <div className={`animate-pulse bg-gray-200 ${rounded} ${className}`} />
);

export default Skeleton;

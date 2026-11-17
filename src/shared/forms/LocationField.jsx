import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchLocations } from './locations';

const control =
    'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none disabled:bg-gray-50 disabled:text-gray-400';

/**
 * Country, state or district, read from the shared location master data.
 *
 * These are not ordinary choice fields: which states exist depends on the
 * country the participant just picked, so the list is fetched as the cascade is
 * walked rather than frozen into the form's schema. The value stored is the
 * row's id, so a district renamed in the master data reads correctly on every
 * registration ever made.
 */
const LocationField = ({ field, level, parentId, value, onChange, disabled, error }) => {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);

    // A level below country has nothing to show until its parent is chosen.
    const waiting = level !== 'country' && !parentId;

    useEffect(() => {
        if (waiting) {
            setOptions([]);
            return undefined;
        }

        let live = true;
        setLoading(true);

        fetchLocations(level, parentId)
            .then((rows) => live && setOptions(rows))
            .catch(() => live && setOptions([]))
            .finally(() => live && setLoading(false));

        // Ignores a response that arrives after the parent changed again.
        return () => {
            live = false;
        };
    }, [level, parentId, waiting]);

    // A value that no longer belongs under the current parent is dropped, so
    // switching country cannot leave a stale state selected underneath.
    useEffect(() => {
        if (waiting && value) {
            onChange(field.key, '');
            return;
        }

        if (!value || loading || options.length === 0) return;

        if (!options.some((option) => option.value === String(value))) {
            onChange(field.key, '');
        }
        // onChange identity is not stable across renders in the public form.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options, loading, waiting, value, field.key]);

    const placeholder = waiting
        ? `Choose a ${level === 'state' ? 'country' : 'state'} first`
        : loading
          ? 'Loading…'
          : `Select ${field.label.toLowerCase()}…`;

    return (
        <div className="relative">
            <select
                id={field.key}
                value={value ?? ''}
                disabled={disabled || waiting || loading}
                onChange={(e) => onChange(field.key, e.target.value)}
                className={`${control} ${error ? 'border-red-400' : ''}`}
            >
                <option value="">{placeholder}</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>

            {loading && (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400 absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
        </div>
    );
};

export default LocationField;

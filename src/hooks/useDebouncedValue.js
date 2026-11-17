import { useEffect, useState } from 'react';

/**
 * A value that follows `value` only after it has stopped changing for `delay` ms.
 *
 * Keep the input bound to the live value so typing feels instant, and drive the
 * request from this one so a burst of keystrokes sends a single search.
 */
export const useDebouncedValue = (value, delay = 400) => {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
};

export default useDebouncedValue;

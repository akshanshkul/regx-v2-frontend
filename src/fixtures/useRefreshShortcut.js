import { useEffect } from 'react';

const isEditableTarget = (target) =>
    target instanceof Element
    && (
        target.isContentEditable
        || target.closest('[contenteditable="true"], input, textarea, select, [role="textbox"]')
    );

export const useRefreshShortcut = (refresh) => {
    useEffect(() => {
        const handleKeyDown = (event) => {
            const isRefreshKey = event.key?.toLowerCase() === 'r' || event.code === 'KeyR';

            if (
                !isRefreshKey
                || event.altKey
                || event.ctrlKey
                || event.metaKey
                || event.shiftKey
                || event.repeat
                || isEditableTarget(event.target)
            ) {
                return;
            }

            event.preventDefault();
            refresh();
        };

        document.addEventListener('keydown', handleKeyDown, true);

        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [refresh]);
};

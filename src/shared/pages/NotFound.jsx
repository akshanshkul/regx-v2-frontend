import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass } from 'lucide-react';

/**
 * Anything that matches no route.
 *
 * Worth having for its own sake: without it an unknown URL renders nothing at
 * all, and a blank page reads as a bug in the app rather than as a wrong
 * address. Showing the path back is what tells someone which it was.
 */
const NotFound = () => {
    const { pathname } = useLocation();

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <Compass className="w-12 h-12 text-gray-300 mx-auto mb-5" />

                <h1 className="text-2xl font-bold text-gray-900">This page does not exist</h1>

                <p className="text-sm text-gray-500 mt-2">
                    Nothing is served at{' '}
                    <span className="font-mono text-gray-700 break-all">{pathname}</span>.
                </p>

                <div className="flex items-center justify-center gap-2 mt-6">
                    <Link
                        to="/dashboard/my-events"
                        className="px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        My events
                    </Link>

                    <Link
                        to="/"
                        className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-white transition-colors"
                    >
                        Home
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default NotFound;

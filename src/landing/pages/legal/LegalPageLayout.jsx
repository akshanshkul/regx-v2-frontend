import React from 'react';
import { Helmet } from 'react-helmet-async';

const LegalPageLayout = ({ title, lastUpdated, children }) => {
    return (
        <div className="pt-32 pb-24 bg-white min-h-screen">
            <Helmet>
                <title>{title} | RegX</title>
                <meta name="description" content={`Read the ${title} for RegX.`} />
            </Helmet>
            <div className="max-w-4xl mx-auto px-4">
                <div className="mb-12 border-b border-gray-100 pb-8">
                    <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
                        {title}
                    </h1>
                    {lastUpdated && (
                        <p className="text-gray-500 text-sm font-medium">
                            Last Updated: {lastUpdated}
                        </p>
                    )}
                </div>
                <div className="prose prose-gray max-w-none text-gray-600 space-y-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default LegalPageLayout;

import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const AuthLayout = () => {
    return (
        <div className="min-h-screen bg-regx-cream flex items-center justify-center p-4">
            <div className="absolute top-4 left-4 sm:top-8 sm:left-8">
                <Link to="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-regx-dark transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to website
                </Link>
            </div>
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link to="/" className="inline-block text-2xl font-bold font-display">
                        Reg<span className="text-regx-orange">X</span>
                    </Link>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100">
                    <Outlet />
                </div>
                <div className="mt-8 text-center text-xs text-gray-400">
                    <p>© {new Date().getFullYear()} RegX. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;

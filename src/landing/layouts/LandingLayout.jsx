import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Outlet } from 'react-router-dom';

const LandingLayout = () => {
    return (
        <div className="min-h-screen flex flex-col font-sans bg-regx-cream text-regx-dark">
            <Navbar />
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default LandingLayout;

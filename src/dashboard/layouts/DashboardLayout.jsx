import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import DashboardNavbar from '../components/DashboardNavbar';
import MobileNumberPrompt from '../components/MobileNumberPrompt';

const DashboardLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
            
            <div className="flex-1 lg:ml-64 flex flex-col min-w-0 min-h-screen transition-all">
                <DashboardNavbar setIsOpen={setSidebarOpen} />
                
                <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-8xl mx-auto w-full">
                    <MobileNumberPrompt />
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;

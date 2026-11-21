import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../dashboard/layouts/DashboardLayout';
import Dashboard from '../dashboard/pages/Dashboard';
import Profile from '../dashboard/pages/Profile';
import Payments from '../dashboard/pages/Payments';
import { useAuth } from '../hooks/useAuth';

const Settings = () => <div className="p-6">Settings (Coming soon)</div>;

const ProtectedRoutes = () => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return null; // or a full screen loading spinner
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <Routes>
            <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="profile" element={<Profile />} />
                <Route path="subscription" element={<Navigate to="/dashboard/wallet" replace />} />
                <Route path="billing" element={<Navigate to="/dashboard/wallet" replace />} />
                <Route path="payments" element={<Payments />} />
                <Route path="settings" element={<Settings />} />
            </Route>
        </Routes>
    );
};

export default ProtectedRoutes;

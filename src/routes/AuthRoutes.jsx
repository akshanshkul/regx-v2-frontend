import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../auth/layouts/AuthLayout';
import Login from '../auth/pages/Login';
import Signup from '../auth/pages/Signup';
import ForgotPassword from '../auth/pages/ForgotPassword';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../shared/components/Spinner';

const AuthRoutes = () => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-regx-cream flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <Routes>
            <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
            </Route>
        </Routes>
    );
};

export default AuthRoutes;

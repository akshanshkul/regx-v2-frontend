import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import Input from '../../shared/components/Input';
import Button from '../../shared/components/Button';
import toast from 'react-hot-toast';

const Profile = () => {
    const { user, refreshUser } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [loading, setLoading] = useState(false);
    const [passLoading, setPassLoading] = useState(false);
    
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.put('/user/profile', { name });
            if (response.success) {
                toast.success('Profile updated successfully');
                await refreshUser();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        setPassLoading(true);
        try {
            const response = await api.put('/user/password', { 
                current_password: currentPassword, 
                new_password: newPassword 
            });
            if (response.success) {
                toast.success('Password updated successfully');
                setCurrentPassword('');
                setNewPassword('');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update password');
        } finally {
            setPassLoading(false);
        }
    };

    return (
        <div className="max-w-3xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold font-display text-gray-900">Profile Settings</h1>
                <p className="text-gray-500 mt-1">Manage your account details and password.</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-200">
                    <h2 className="text-lg font-bold">Personal Information</h2>
                </div>
                <div className="p-5">
                    <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-md">
                        <Input
                            label="Email Address (Cannot be changed)"
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="opacity-75"
                        />
                        <Input
                            label="Full Name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                        <Button type="submit" isLoading={loading}>Save Changes</Button>
                    </form>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-200">
                    <h2 className="text-lg font-bold">Change Password</h2>
                </div>
                <div className="p-5">
                    <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
                        <Input
                            label="Current Password"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                        />
                        <Input
                            label="New Password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                        <Button type="submit" isLoading={passLoading}>Update Password</Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Profile;

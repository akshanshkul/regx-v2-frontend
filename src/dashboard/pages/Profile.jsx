import React, { useEffect, useState } from 'react';
import { Camera, UserRound } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import Input from '../../shared/components/Input';
import Button from '../../shared/components/Button';
import toast from 'react-hot-toast';

const Profile = () => {
    const { user, refreshUser } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [loading, setLoading] = useState(false);
    const [phoneLoading, setPhoneLoading] = useState(false);
    const [avatarSelection, setAvatarSelection] = useState(null);
    const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState(null);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [passLoading, setPassLoading] = useState(false);
    
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        if (!avatarSelection) return undefined;
        return () => URL.revokeObjectURL(avatarSelection.previewUrl);
    }, [avatarSelection]);

    const avatarPreview = avatarSelection?.previewUrl || uploadedAvatarUrl || user?.avatar || '';

    const handleAvatarSelect = (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            toast.error('Choose a JPG, PNG or WebP image.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('The profile picture must be 5 MB or smaller.');
            return;
        }

        setAvatarSelection({
            file,
            previewUrl: URL.createObjectURL(file),
        });
    };

    const handleAvatarUpload = async () => {
        if (!avatarSelection) return;
        setAvatarLoading(true);
        try {
            const formData = new FormData();
            formData.append('avatar', avatarSelection.file);
            const response = await api.post('/user/profile/avatar', formData);
            setUploadedAvatarUrl(response.data?.avatar || '');
            setAvatarSelection(null);
            await refreshUser();
            toast.success(response.message || 'Profile picture updated.');
        } catch (error) {
            const fieldMessage = error.response?.data?.messages?.avatar;
            toast.error(fieldMessage || error.response?.data?.message || 'Failed to update profile picture.');
        } finally {
            setAvatarLoading(false);
        }
    };

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

    const handleMobileUpdate = async (e) => {
        e.preventDefault();
        setPhoneLoading(true);
        try {
            const response = await api.put('/user/mobile', { phone });
            if (!response?.success) {
                throw new Error(response?.message || 'Could not update your mobile number.');
            }

            setPhone(response.data?.phone || phone);
            await refreshUser();
            toast.success('Mobile number updated successfully.');
        } catch (error) {
            const message = error.response?.data?.messages?.phone
                || error.response?.data?.message
                || error.message
                || 'Could not update your mobile number.';
            toast.error(message);
        } finally {
            setPhoneLoading(false);
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
                    <h2 className="text-lg font-bold">Mobile number</h2>
                    <p className="mt-1 text-sm text-gray-500">Update the mobile number saved to your account.</p>
                </div>
                <div className="p-5">
                    <form onSubmit={handleMobileUpdate} className="space-y-4 max-w-md">
                        <Input
                            label="Mobile number"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            autoComplete="tel"
                            inputMode="tel"
                            maxLength={24}
                            placeholder="+91 98765 43210"
                            required
                        />
                        <Button type="submit" isLoading={phoneLoading}>Update mobile number</Button>
                    </form>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-200">
                    <h2 className="text-lg font-bold">Personal Information</h2>
                </div>
                <div className="p-5">
                    <div className="flex flex-wrap items-center gap-4 mb-6">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                            {avatarPreview ? (
                                <img
                                    src={avatarPreview}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                    onError={() => setUploadedAvatarUrl('')}
                                />
                            ) : (
                                <UserRound className="w-9 h-9" />
                            )}
                        </div>
                        <div className="space-y-2">
                            <label
                                htmlFor="profile-avatar"
                                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                            >
                                <Camera className="w-4 h-4" />
                                Choose profile picture
                            </label>
                            <input
                                id="profile-avatar"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleAvatarSelect}
                                className="sr-only"
                            />
                            <p className="text-xs text-gray-500">JPG, PNG or WebP · Up to 5 MB</p>
                            {avatarSelection && (
                                <Button
                                    type="button"
                                    size="sm"
                                    isLoading={avatarLoading}
                                    onClick={handleAvatarUpload}
                                >
                                    Update profile picture
                                </Button>
                            )}
                        </div>
                    </div>
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

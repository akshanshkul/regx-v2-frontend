import React, { useState } from 'react';
import { Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../shared/components/Button';
import Input from '../../shared/components/Input';

const MobileNumberPrompt = () => {
    const { user, refreshUser, logout } = useAuth();
    const [phone, setPhone] = useState(user?.phone || '');
    const [savedPhone, setSavedPhone] = useState('');
    const [saving, setSaving] = useState(false);
    const hasPhone = Boolean(user?.phone || savedPhone);
    const showModal = Boolean(user && !hasPhone);

    const saveMobile = async (event) => {
        event.preventDefault();
        setSaving(true);

        try {
            const response = await api.put('/user/mobile', { phone });
            if (!response?.success) {
                throw new Error(response?.message || 'Could not save your mobile number.');
            }

            setSavedPhone(response.data?.phone || phone);
            await refreshUser();
            toast.success('Mobile number saved.');
        } catch (error) {
            const message = error.response?.data?.messages?.phone
                || error.response?.data?.message
                || error.message
                || 'Could not save your mobile number.';
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        showModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="mobile-number-title"
                    aria-describedby="mobile-number-description"
                    className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
                >
                    <div className="flex items-start gap-3">
                        <Phone className="mt-1 h-5 w-5 shrink-0 text-regx-orange" />
                        <div>
                            <h2 id="mobile-number-title" className="text-lg font-bold text-gray-900">
                                Add your mobile number
                            </h2>
                            <p id="mobile-number-description" className="mt-1 text-sm text-gray-600">
                                A mobile number is required to continue to your dashboard.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={saveMobile} className="mt-5 space-y-4">
                        <Input
                            label="Mobile number"
                            type="tel"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            autoComplete="tel"
                            inputMode="tel"
                            maxLength={24}
                            placeholder="+91 98765 43210"
                            required
                        />
                        <p className="-mt-2 text-xs text-gray-500">You can include a country code.</p>
                        <div className="flex justify-between gap-2">
                            <Button type="button" variant="light" onClick={logout}>
                                Sign out
                            </Button>
                            <Button type="submit" isLoading={saving}>
                                Save and continue
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        )
    );
};

export default MobileNumberPrompt;

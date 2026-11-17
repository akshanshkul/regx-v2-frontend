import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, MailCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../shared/components/Input';
import Button from '../../shared/components/Button';

const RESEND_SECONDS = 60;

/**
 * Resetting a forgotten password with a 6-digit code sent by email.
 *
 *   1. email     — ask for a code
 *   2. code      — the code and the new password
 *   3. done      — back to sign in
 *
 * The server says the same thing whether or not the email has an account, so
 * this page does too: "if an account exists, a code is on its way".
 */
const ForgotPassword = () => {
    const { forgotPassword, resetPassword } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [resendIn, setResendIn] = useState(0);
    const codeRef = useRef(null);

    // Counts down to when another code may be asked for.
    useEffect(() => {
        if (resendIn <= 0) return undefined;

        const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendIn]);

    useEffect(() => {
        if (step === 'code') codeRef.current?.focus();
    }, [step]);

    const sendCode = async ({ resend = false } = {}) => {
        setLoading(true);
        setErrors({});

        try {
            await forgotPassword(email.trim());
            setStep('code');
            setResendIn(RESEND_SECONDS);
            setOtp('');

            if (resend) toast.success('A new code is on its way');
        } catch (error) {
            // Too many requests still moves on if a code was sent earlier.
            if (resend) toast.error(error.message);
            else setErrors({ email: error.message || 'Could not send the code. Try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSendCode = (e) => {
        e.preventDefault();
        sendCode();
    };

    const handleReset = async (e) => {
        e.preventDefault();

        const local = {};
        if (!/^\d{6}$/.test(otp)) local.otp = 'Enter the 6-digit code from the email.';
        if (newPassword.length < 6) local.new_password = 'Use at least 6 characters.';
        if (newPassword !== confirmPassword) local.confirm = 'The two passwords do not match.';

        setErrors(local);
        if (Object.keys(local).length > 0) return;

        setLoading(true);

        try {
            await resetPassword(email.trim(), otp, newPassword);
            setStep('done');
        } catch (error) {
            const field = error.code === 'new_password' ? 'new_password' : error.code === 'email' ? 'email' : 'otp';
            setErrors({ [field]: error.message || 'Could not reset the password. Try again.' });

            // A cancelled code cannot be retried; clear it for the new one.
            if (/new code/i.test(error.message ?? '')) setOtp('');
        } finally {
            setLoading(false);
        }
    };

    if (step === 'done') {
        return (
            <div className="text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold font-display text-regx-dark mb-2">Password changed</h1>
                <p className="text-gray-500 text-sm mb-6">You can now sign in with your new password.</p>
                <Button type="button" className="w-full" onClick={() => navigate('/login')}>
                    Sign in
                </Button>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-2xl font-bold font-display text-regx-dark mb-2">Reset your password</h1>

            {step === 'email' ? (
                <>
                    <p className="text-gray-500 text-sm mb-6">
                        Enter the email you sign in with and we will send you a 6-digit code.
                    </p>
                    <form onSubmit={handleSendCode} className="space-y-4" noValidate>
                        <Input
                            label="Email address"
                            type="email"
                            placeholder="name@organization.com"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setErrors({});
                            }}
                            error={errors.email}
                            autoComplete="email"
                            autoFocus
                            required
                        />
                        <Button type="submit" className="w-full mt-4" isLoading={loading} disabled={!/\S+@\S+\.\S+/.test(email)}>
                            Send code
                        </Button>
                    </form>
                </>
            ) : (
                <>
                    <div className="flex items-start gap-3 rounded-xl bg-orange-50 border border-orange-100 p-3 mb-5">
                        <MailCheck className="w-5 h-5 text-regx-orange shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-700">
                            If an account exists for <b className="break-all">{email}</b>, a 6-digit code is on its way.
                            It works for 15 minutes. Check your spam folder too.
                        </p>
                    </div>

                    <form onSubmit={handleReset} className="space-y-4" noValidate>
                        <div>
                            <label htmlFor="reset-code" className="block text-sm font-medium text-gray-700 mb-1">
                                6-digit code
                            </label>
                            <input
                                ref={codeRef}
                                id="reset-code"
                                value={otp}
                                onChange={(e) => {
                                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                                    setErrors((er) => ({ ...er, otp: undefined }));
                                }}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                placeholder="••••••"
                                maxLength={6}
                                aria-invalid={Boolean(errors.otp)}
                                className={`w-full px-3 py-3 border rounded-lg text-center text-2xl font-mono tracking-[0.6em] focus:outline-none focus:ring-1 focus:ring-regx-orange focus:border-regx-orange ${
                                    errors.otp ? 'border-red-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.otp && <p className="mt-1 text-sm text-red-600">{errors.otp}</p>}
                        </div>

                        <Input
                            label="New password"
                            type="password"
                            placeholder="At least 6 characters"
                            value={newPassword}
                            onChange={(e) => {
                                setNewPassword(e.target.value);
                                setErrors((er) => ({ ...er, new_password: undefined }));
                            }}
                            error={errors.new_password}
                            autoComplete="new-password"
                            required
                        />
                        <Input
                            label="Confirm new password"
                            type="password"
                            placeholder="Type it again"
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                setErrors((er) => ({ ...er, confirm: undefined }));
                            }}
                            error={errors.confirm}
                            autoComplete="new-password"
                            required
                        />

                        <Button type="submit" className="w-full mt-2" isLoading={loading}>
                            Change password
                        </Button>

                        <div className="flex items-center justify-between text-sm">
                            <button
                                type="button"
                                onClick={() => {
                                    setStep('email');
                                    setErrors({});
                                }}
                                className="font-medium text-gray-500 hover:text-regx-dark"
                            >
                                Use a different email
                            </button>
                            <button
                                type="button"
                                onClick={() => sendCode({ resend: true })}
                                disabled={resendIn > 0 || loading}
                                className="font-medium text-regx-orange hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
                            >
                                {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                            </button>
                        </div>
                    </form>
                </>
            )}

            <p className="mt-6 text-center text-sm text-gray-500">
                Remember your password?{' '}
                <Link to="/login" className="font-medium text-regx-orange hover:underline">
                    Sign in
                </Link>
            </p>
        </div>
    );
};

export default ForgotPassword;

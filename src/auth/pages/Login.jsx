import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../shared/components/Input';
import Button from '../../shared/components/Button';
import GoogleAuthButton from '../components/GoogleAuthButton';
import toast from 'react-hot-toast';

const Login = () => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            toast.success('Logged in successfully');
            // Navigate will be handled by AuthContext or use navigate
            window.location.href = '/dashboard';
        } catch (error) {
            toast.error(error.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold font-display text-regx-dark mb-2">Welcome back</h1>
            <p className="text-gray-500 text-sm mb-6">Sign in to continue to your account.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Email address"
                    type="email"
                    placeholder="name@organization.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    required
                />
                
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <Link to="/forgot-password" className="text-xs font-medium text-regx-orange hover:underline">
                            Forgot password?
                        </Link>
                    </div>
                    <Input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                    />
                </div>

                <Button type="submit" className="w-full mt-2" isLoading={loading}>
                    Sign In
                </Button>
            </form>

            <div className="mt-6 flex items-center">
                <div className="flex-1 border-t border-gray-200"></div>
                <div className="px-3 text-xs text-gray-400 uppercase tracking-widest font-medium">OR</div>
                <div className="flex-1 border-t border-gray-200"></div>
            </div>

            <GoogleAuthButton intent="login" label="Continue with Google" />

            <p className="mt-6 text-center text-sm text-gray-500">
                Don't have an account?{' '}
                <Link to="/signup" className="font-medium text-regx-orange hover:underline">
                    Create account
                </Link>
            </p>
        </div>
    );
};

export default Login;

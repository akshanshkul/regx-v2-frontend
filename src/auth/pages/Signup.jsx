import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../shared/components/Input';
import Button from '../../shared/components/Button';
import toast from 'react-hot-toast';

const SPORTS_LIST = ['Cricket', 'Football', 'Tennis', 'Badminton', 'Basketball', 'Table Tennis', 'Volleyball', 'Athletics', 'Other'];

const Signup = () => {
    const [searchParams] = useSearchParams();
    const { signup } = useAuth();
    
    const [name, setName] = useState('');
    const [email, setEmail] = useState(() => searchParams.get('email') || '');
    const [selectedSports, setSelectedSports] = useState([]);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [agreeTerms, setAgreeTerms] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirm) {
            toast.error('Passwords do not match');
            return;
        }

        if (!agreeTerms) {
            toast.error('You must agree to the Terms & Conditions');
            return;
        }

        setLoading(true);
        try {
            await signup(name, email, password, selectedSports);
            toast.success('Account created successfully');
            window.location.href = '/dashboard';
        } catch (error) {
            toast.error(error.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold font-display text-regx-dark mb-2">Create account</h1>
            <p className="text-gray-500 text-sm mb-6">Join RegX and start managing your events.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Full name"
                    type="text"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                
                <Input
                    label="Email address"
                    type="email"
                    placeholder="name@organization.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Which sports do you manage? <span className="text-gray-400 font-normal">(Select all that apply)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {SPORTS_LIST.map((sport) => {
                            const isSelected = selectedSports.includes(sport);
                            return (
                                <button
                                    key={sport}
                                    type="button"
                                    onClick={() => {
                                        if (isSelected) {
                                            setSelectedSports(selectedSports.filter(s => s !== sport));
                                        } else {
                                            setSelectedSports([...selectedSports, sport]);
                                        }
                                    }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                                        isSelected 
                                            ? 'bg-regx-orange text-white border-regx-orange' 
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-regx-orange/50 hover:bg-orange-50'
                                    }`}
                                >
                                    {sport}
                                </button>
                            );
                        })}
                    </div>
                </div>
                
                <Input
                    label="Password"
                    type="password"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                />

                <Input
                    label="Confirm password"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                />

                <div className="flex items-start mt-2">
                    <div className="flex items-center h-5">
                        <input
                            id="terms"
                            type="checkbox"
                            checked={agreeTerms}
                            onChange={(e) => setAgreeTerms(e.target.checked)}
                            className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-regx-orange/20 text-regx-orange accent-regx-orange"
                        />
                    </div>
                    <label htmlFor="terms" className="ml-2 text-xs font-medium text-gray-600">
                        I agree to the <Link to="/terms" className="text-regx-orange hover:underline">Terms & Conditions</Link> and <Link to="/privacy" className="text-regx-orange hover:underline">Privacy Policy</Link>.
                    </label>
                </div>

                <Button type="submit" className="w-full mt-4" isLoading={loading}>
                    Create Account
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-regx-orange hover:underline">
                    Sign in
                </Link>
            </p>
        </div>
    );
};

export default Signup;

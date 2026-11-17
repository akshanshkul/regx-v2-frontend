import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CTA = () => {
    const [email, setEmail] = useState('');
    const navigate = useNavigate();

    const handleGetStarted = () => {
        if (email.trim()) {
            navigate(`/signup?email=${encodeURIComponent(email)}`);
        } else {
            navigate('/signup');
        }
    };

    return (
        <section className="py-24 bg-[#F3F2EE]">
            <div className="max-w-5xl mx-auto px-4">
                <div className="bg-gradient-to-br from-[#1c1a17] via-[#2a2520] to-[#4a3f35] rounded-[32px] p-10 md:p-16 relative overflow-hidden">
                    <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-regx-orange/20 rounded-full blur-[100px] pointer-events-none"></div>
                    <div className="absolute top-0 right-0 w-[200%] h-px bg-white/5 -rotate-45 transform origin-top-right"></div>
                    
                    <div className="relative z-10 grid lg:grid-cols-[1fr_auto] gap-10 items-center">
                        <div>
                            <div className="text-gray-400 text-[10px] font-bold tracking-[0.2em] uppercase mb-4">
                                Ready when you are
                            </div>
                            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                                Ready to run a better<br />event?
                            </h2>
                            <p className="text-gray-400 text-sm md:text-[15px]">
                                Join modern sports organizations using RegX to simplify event operations.
                            </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGetStarted()}
                                placeholder="Enter your email address" 
                                className="px-5 py-3.5 rounded-lg bg-white text-sm min-w-[280px] focus:outline-none focus:ring-2 focus:ring-regx-orange border-0"
                            />
                            <button 
                                onClick={handleGetStarted}
                                className="bg-regx-orange hover:bg-orange-600 text-white font-bold text-sm px-6 py-3.5 rounded-lg flex items-center justify-center transition-colors shadow-lg shadow-regx-orange/20 whitespace-nowrap"
                            >
                                Get started <ArrowRight className="w-4 h-4 ml-2" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CTA;

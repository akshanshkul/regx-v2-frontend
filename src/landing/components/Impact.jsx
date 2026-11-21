import React from 'react';
import { Target, Trophy } from 'lucide-react';

const Impact = () => {
    return (
        <section className="py-24 md:py-32 bg-[#Fbfaf8]">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <div className="text-regx-orange text-[10px] font-bold tracking-widest uppercase mb-3">Loved by organizers</div>
                    <h2 className="font-display text-4xl md:text-[42px] tracking-tight font-bold text-gray-900 mb-4">
                        Real events. Real impact.
                    </h2>
                    <p className="text-gray-500 text-sm">
                        RegX is designed around the operational challenges of modern sports organizations.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 max-w-8xl mx-auto">
                    {/* Card 1 */}
                    <div className="bg-[#18181b] rounded-2xl p-8 md:p-10 relative overflow-hidden group flex flex-col min-h-[400px]">
                        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-regx-orange/20 rounded-full blur-[80px] group-hover:bg-regx-orange/30 transition-colors duration-500"></div>
                        <div className="absolute inset-0 border border-white/5 rounded-2xl pointer-events-none"></div>
                        
                        <div className="relative z-10 flex-1">
                            <div className="inline-block border border-white/10 rounded px-2.5 py-1 text-[8px] font-bold tracking-widest text-gray-400 uppercase mb-8">
                                Federation Platform
                            </div>
                            
                            <Target className="w-6 h-6 text-regx-orange mb-6" />
                            
                            <h3 className="text-2xl font-display font-bold text-white mb-4">UPAWA</h3>
                            <p className="text-gray-400 text-xs leading-relaxed max-w-sm">
                                A digital platform for the Bharat Arm Wrestling federation, bringing participant 
                                engagement and event operations into a connected workflow.
                            </p>
                        </div>

                        <div className="relative z-10 border-t border-white/10 pt-5 mt-8 flex justify-between items-center text-[10px]">
                            <span className="text-gray-500 font-medium">Sport</span>
                            <span className="text-gray-300 font-bold">Arm Wrestling</span>
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-[#18181b] rounded-2xl p-8 md:p-10 relative overflow-hidden group flex flex-col min-h-[400px]">
                        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-regx-orange/20 rounded-full blur-[80px] group-hover:bg-regx-orange/30 transition-colors duration-500"></div>
                        <div className="absolute inset-0 border border-white/5 rounded-2xl pointer-events-none"></div>
                        
                        <div className="relative z-10 flex-1">
                            <div className="inline-block border border-white/10 rounded px-2.5 py-1 text-[8px] font-bold tracking-widest text-gray-400 uppercase mb-8">
                                Nationwide Rollout
                            </div>
                            
                            <Trophy className="w-6 h-6 text-regx-orange mb-6" />
                            
                            <h3 className="text-2xl font-display font-bold text-white mb-4">Pro Panja League</h3>
                            <p className="text-gray-400 text-xs leading-relaxed max-w-sm">
                                A participant registration pipeline designed for India's arm wrestling league and 
                                nationwide event operations.
                            </p>
                        </div>

                        <div className="relative z-10 border-t border-white/10 pt-5 mt-8 flex justify-between items-center text-[10px]">
                            <span className="text-gray-500 font-medium">Coverage</span>
                            <span className="text-gray-300 font-bold">Pan-India</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Impact;

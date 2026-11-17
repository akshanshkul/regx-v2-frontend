import React from 'react';
import { ArrowRight, Users, CheckCircle2 } from 'lucide-react';
import Button from '../../shared/components/Button';

const BetterWay = () => {
    return (
        <section className="py-24 md:py-32 bg-[#F3F2EE]">
            <div className="max-w-6xl mx-auto px-4">
                <div className="grid md:grid-cols-2 gap-16 lg:gap-24 items-center">
                    {/* Left Content */}
                    <div>
                        <div className="text-regx-orange text-[10px] font-bold tracking-widest uppercase mb-4">Built for people</div>
                        <h2 className="font-display text-4xl md:text-5xl lg:text-[54px] leading-[1.1] tracking-tight font-bold text-gray-900 mb-6">
                            A better way to work together
                        </h2>
                        <p className="text-gray-500 text-lg mb-8 leading-relaxed max-w-md">
                            RegX brings organizers, officials and athletes onto the same workflow 
                            — so everyone stays aligned, productive and in control.
                        </p>
                        
                        <Button variant="primary" className="mb-12 shadow-lg shadow-regx-orange/20 px-6 py-3">
                            Get started <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>

                        <div className="border-t border-gray-300/50 pt-8 grid grid-cols-3 gap-6">
                            <div>
                                <div className="text-2xl font-bold text-regx-orange font-display">10K+</div>
                                <div className="text-[9px] text-gray-500 uppercase tracking-wide mt-1">Event organizers</div>
                            </div>
                            <div className="border-l border-gray-300/50 pl-6">
                                <div className="text-2xl font-bold text-regx-orange font-display">2M+</div>
                                <div className="text-[9px] text-gray-500 uppercase tracking-wide mt-1">Athletes registered</div>
                            </div>
                            <div className="border-l border-gray-300/50 pl-6">
                                <div className="text-2xl font-bold text-regx-orange font-display">98%</div>
                                <div className="text-[9px] text-gray-500 uppercase tracking-wide mt-1">Happy users</div>
                            </div>
                        </div>
                    </div>

                    {/* Right Graphic */}
                    <div className="relative">
                        <div className="w-full aspect-[4/3] rounded-3xl overflow-hidden relative bg-gradient-to-br from-[#3b332c] via-[#5c5044] to-[#968676] shadow-2xl">
                            {/* Flares and decorations */}
                            <div className="absolute -top-32 -left-32 w-96 h-96 bg-regx-orange/40 rounded-full blur-[80px]"></div>
                            
                            {/* Diagonal Line */}
                            <div className="absolute top-0 right-0 w-[200%] h-px bg-white/10 -rotate-45 transform origin-top-right"></div>
                            <div className="absolute top-10 right-0 w-[200%] h-px bg-white/5 -rotate-45 transform origin-top-right"></div>

                            {/* Center Content */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <Users className="w-16 h-16 text-white/90 mb-4" strokeWidth={1.5} />
                                <div className="text-white/60 text-[8px] font-bold tracking-[0.2em]">ORGANIZERS • OFFICIALS • ATHLETES</div>
                            </div>

                            {/* Floating White Card */}
                            <div className="absolute bottom-6 right-6 bg-white rounded-xl p-4 shadow-xl max-w-[200px]">
                                <h4 className="font-bold text-xs text-gray-900 mb-1">Better events</h4>
                                <p className="text-[10px] text-gray-500 leading-tight">start with better operations.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default BetterWay;

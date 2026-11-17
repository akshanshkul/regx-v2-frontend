import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const CustomDashboard = () => {
    return (
        <section className="py-20 bg-white border-b border-gray-100">
            <div className="max-w-6xl mx-auto px-4">
                <div className="bg-orange-50/50 rounded-[32px] p-8 md:p-12 border border-orange-100/50 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex-1">
                        <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-orange-100 text-regx-orange text-xs font-bold mb-6 shadow-sm">
                            <Sparkles className="w-3.5 h-3.5" /> Premium Offering
                        </div>
                        <h3 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight leading-tight">
                            Need a custom <span className="text-regx-orange">league</span> or event dashboard?
                        </h3>
                        <p className="text-gray-600 text-sm md:text-base leading-relaxed max-w-xl">
                            We provide fully custom league and event dashboards tailored to your exact operational requirements. 
                            From bespoke scoring algorithms to dedicated sponsor integrations, our enterprise team builds features specifically for you.
                        </p>
                    </div>
                    
                    <div className="shrink-0 flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <Link to="/contact" className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 font-bold text-sm px-6 py-3.5 rounded-xl flex items-center justify-center transition-colors shadow-sm text-center">
                            Talk to Sales <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CustomDashboard;

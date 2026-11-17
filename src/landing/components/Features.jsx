import React from 'react';
import { Users, Layout, Zap, BarChart } from 'lucide-react';

const Features = () => {
    const features = [
        {
            icon: <Users className="w-5 h-5 text-red-500" />,
            bg: 'bg-red-50',
            title: 'Smart registrations',
            desc: 'Custom forms, categories, age groups and eligibility rules.',
            num: '01'
        },
        {
            icon: <Layout className="w-5 h-5 text-green-600" />,
            bg: 'bg-green-50',
            title: 'Automated fixtures',
            desc: 'Generate brackets and schedules in seconds, not hours.',
            num: '02'
        },
        {
            icon: <Zap className="w-5 h-5 text-orange-500" />,
            bg: 'bg-orange-50',
            title: 'Live scoring',
            desc: 'Update results in real time directly from the venue.',
            num: '03'
        },
        {
            icon: <BarChart className="w-5 h-5 text-blue-500" />,
            bg: 'bg-blue-50',
            title: 'Reports & analytics',
            desc: 'Get insights and keep your organization informed.',
            num: '04'
        }
    ];

    return (
        <section id="platform" className="py-24 md:py-32 bg-[#Fbfaf8]">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center max-w-2xl mx-auto">
                    <div className="text-regx-orange text-xs font-bold tracking-widest uppercase mb-3">Everything you need</div>
                    <h2 className="font-display text-4xl md:text-5xl tracking-tight font-bold">
                        Built for modern event operations
                    </h2>
                    <p className="mt-4 text-gray-500 text-lg">
                        From registrations to results, RegX gives your team the tools
                        to run successful events with less effort and more control.
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
                    {features.map((item, index) => (
                        <div key={index} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                {item.icon}
                            </div>
                            <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                            <div className="absolute -bottom-4 -right-2 text-[80px] font-display font-bold text-gray-50 opacity-50 select-none group-hover:scale-110 transition-transform">
                                {item.num}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;

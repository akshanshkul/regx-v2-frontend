import React from 'react';
import { ClipboardCheck, GitMerge, Radio, Trophy } from 'lucide-react';

const Workflow = () => {
    const steps = [
        {
            num: '01',
            icon: <ClipboardCheck className="w-5 h-5 text-regx-orange" />,
            title: 'Register',
            desc: 'Athletes sign up and select their categories.'
        },
        {
            num: '02',
            icon: <GitMerge className="w-5 h-5 text-regx-orange" />,
            title: 'Draw',
            desc: 'Create brackets, seed players and schedule matches.'
        },
        {
            num: '03',
            icon: <Radio className="w-5 h-5 text-regx-orange" />,
            title: 'Go live',
            desc: 'Officials update scores while results publish instantly.'
        },
        {
            num: '04',
            icon: <Trophy className="w-5 h-5 text-regx-orange" />,
            title: 'Finish',
            desc: 'Standings, reports and certificates are ready.'
        }
    ];

    return (
        <section className="py-24 md:py-32 bg-white">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center max-w-2xl mx-auto mb-20">
                    <div className="text-regx-orange text-[10px] font-bold tracking-widest uppercase mb-3">The RegX Workflow</div>
                    <h2 className="font-display text-3xl md:text-[42px] leading-tight tracking-tight font-bold text-gray-900">
                        One event. One connected<br />flow.
                    </h2>
                </div>

                <div className="relative max-w-8xl mx-auto">
                    {/* Connecting Line */}
                    <div className="hidden md:block absolute top-[22px] left-[10%] right-[10%] h-[1px] bg-gray-200"></div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4 relative">
                        {steps.map((step, i) => (
                            <div key={i} className="flex flex-col items-center text-center">
                                {/* Number Bubble */}
                                <div className="w-11 h-11 bg-white rounded-full border border-gray-200 flex items-center justify-center text-regx-orange text-xs font-bold mb-4 relative z-10">
                                    {step.num}
                                </div>
                                {/* Icon */}
                                <div className="mb-3">
                                    {step.icon}
                                </div>
                                {/* Text */}
                                <h4 className="font-bold text-gray-900 text-[15px] mb-2">{step.title}</h4>
                                <p className="text-gray-500 text-[11px] leading-relaxed max-w-[200px]">
                                    {step.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Workflow;

import React from 'react';

const Testimonials = () => {
    const reviews = [
        {
            text: "RegX completely transformed how we manage our events. It is simple, powerful and reliable.",
            name: "Amit Verma",
            role: "Event Director, UPWA",
            initials: "AV"
        },
        {
            text: "The automation and live scoring saved us weeks of manual work. Highly recommended.",
            name: "Neha Singh",
            role: "Operations, Pro Panja League",
            initials: "NS"
        },
        {
            text: "Our participants love the seamless registration experience. Everything stays organized.",
            name: "Rohit Mehta",
            role: "Sports Coordinator",
            initials: "RM"
        }
    ];

    return (
        <section className="py-24 md:py-32 bg-white">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <div className="text-regx-orange text-[10px] font-bold tracking-widest uppercase mb-3">Organizer Stories</div>
                    <h2 className="font-display text-3xl md:text-[42px] leading-tight tracking-tight font-bold text-gray-900">
                        Made for the people behind<br />the event.
                    </h2>
                </div>

                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {reviews.map((review, i) => (
                        <div key={i} className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm flex flex-col justify-between min-h-[220px]">
                            <div>
                                <div className="flex gap-1 mb-4">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <svg key={star} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    ))}
                                </div>
                                <p className="text-gray-600 text-[13px] leading-relaxed mb-6 font-medium">
                                    "{review.text}"
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-orange-50 text-regx-orange flex items-center justify-center text-[10px] font-bold">
                                    {review.initials}
                                </div>
                                <div>
                                    <div className="text-[11px] font-bold text-gray-900">{review.name}</div>
                                    <div className="text-[9px] text-gray-500">{review.role}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Testimonials;

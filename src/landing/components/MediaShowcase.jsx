import React from 'react';

const MediaShowcase = () => (
    <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-3xl text-center">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-regx-orange">
                    See RegX in action
                </p>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">
                    A connected platform for sports event operations
                </h2>
                <p className="mt-5 text-base leading-7 text-gray-600 md:text-lg">
                    Watch the overview, then explore how RegX supports athlete registration,
                    arm wrestling fixtures and event-day results.
                </p>
            </div>

            <div className="mx-auto mt-10 max-w-5xl overflow-hidden rounded-2xl border border-gray-200 bg-gray-950 shadow-xl">
                <div className="aspect-video">
                    <iframe
                        className="h-full w-full"
                        src="https://www.youtube-nocookie.com/embed/Qs0iWb7m10o"
                        title="RegX sports event management platform overview"
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    />
                </div>
            </div>
        </div>
    </section>
);

export default MediaShowcase;

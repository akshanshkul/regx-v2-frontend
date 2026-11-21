import React from 'react';
import { FAQ_ITEMS } from './faqItems';

const FAQs = () => (
    <section className="bg-[#Fbfaf8] py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-4">
            <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-regx-orange">Frequently asked questions</p>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">
                    About RegX sports event management
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-600">
                    Learn how RegX helps sports organizers manage registrations, fixtures and event-day results.
                </p>
            </div>

            <div className="mt-10 space-y-3">
                {FAQ_ITEMS.map(({ question, answer }) => (
                    <details key={question} className="group rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
                        <summary className="cursor-pointer list-none pr-8 font-semibold text-gray-900 marker:hidden">
                            {question}
                            <span className="float-right text-xl leading-5 text-regx-orange transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                        </summary>
                        <p className="mt-3 text-sm leading-6 text-gray-600">{answer}</p>
                    </details>
                ))}
            </div>
        </div>
    </section>
);

export default FAQs;

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, Radio, FileBarChart } from 'lucide-react';

const capabilities = [
    {
        icon: ClipboardList,
        title: 'Plan and publish your event',
        description: 'Set up an event, publish a registration form, collect athlete details and organize entries into the categories your competition needs.',
        examples: 'Event pages · Registration forms · Athlete categories',
    },
    {
        icon: Radio,
        title: 'Coordinate competition day',
        description: 'Give organizers and officials a shared view of the event. Manage attendance and weigh-ins, follow fixtures, and keep match operations moving.',
        examples: 'Attendance · Weigh-in · Fixtures and match progress',
    },
    {
        icon: FileBarChart,
        title: 'Share results and reports',
        description: 'Publish fixture information for participants, review event results, and prepare reports and certificates after the competition.',
        examples: 'Public fixture pages · Reports · Certificates',
    },
];

const PlatformCapabilities = () => (
    <section id="event-management" className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
            <header className="mx-auto max-w-3xl text-center">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-regx-orange">
                    One connected event workspace
                </p>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">
                    Run a sports event from registration to final results
                </h2>
                <p className="mt-5 text-base leading-7 text-gray-600 md:text-lg">
                    RegX brings event setup, athlete entries, competition-day tools and reporting together.
                    Use it to coordinate arm wrestling tournaments and adapt the workflow to other sports events.
                </p>
            </header>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
                {capabilities.map(({ icon: Icon, title, description, examples }) => (
                    <article key={title} className="rounded-2xl border border-gray-200 bg-[#Fbfaf8] p-6 md:p-7">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-regx-orange">
                            <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="mt-5 text-lg font-bold text-gray-900">{title}</h3>
                        <p className="mt-3 text-sm leading-6 text-gray-600">{description}</p>
                        <p className="mt-5 border-t border-gray-200 pt-4 text-xs font-medium leading-5 text-gray-500">
                            {examples}
                        </p>
                    </article>
                ))}
            </div>

            <div className="mt-10 text-center">
                <Link
                    to="/signup"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-regx-orange hover:text-orange-700"
                >
                    Create your RegX account <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </div>
    </section>
);

export default PlatformCapabilities;

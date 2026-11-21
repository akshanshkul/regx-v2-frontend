import React from 'react';
import { ArrowRight, CalendarDays, FileText, PanelsTopLeft, Sparkles, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';

const portalServices = [
    {
        icon: FileText,
        title: 'Content-managed sports website',
        description: 'Publish news, announcements, competition updates, sponsor information and other pages in a portal that fits your organization.',
    },
    {
        icon: UsersRound,
        title: 'Player registration and profiles',
        description: 'Create a player registration flow that works independently of any one event, with a central place to organize athlete information.',
    },
    {
        icon: CalendarDays,
        title: 'Separate event registration and management',
        description: 'Give every event its own details and registration process, then manage categories, fixtures, schedules and results.',
    },
    {
        icon: PanelsTopLeft,
        title: 'A portal tailored to your organization',
        description: 'Bring the pages, workflows, roles and integrations you need together under a consistent sports brand.',
    },
];

const CustomDashboard = () => {
    return (
        <section id="custom-portal" className="border-b border-gray-100 bg-white py-20 md:py-28">
            <div className="max-w-6xl mx-auto px-4">
                <header className="mx-auto max-w-3xl text-center">
                    <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-bold text-regx-orange">
                        <Sparkles className="h-3.5 w-3.5" /> Custom portal services
                    </div>
                    <h2 className="mt-5 font-display text-3xl font-bold leading-tight tracking-tight text-gray-900 md:text-5xl">
                        A custom sports portal for your players, events and content
                    </h2>
                    <p className="mt-5 text-base leading-7 text-gray-600 md:text-lg">
                        We can design and build a specialized sports and event management portal around your organization.
                        Keep player registration separate from event registration, publish your own content, and connect
                        the tools your league or federation needs in one branded experience.
                    </p>
                </header>

                <div className="mt-12 grid gap-5 sm:grid-cols-2">
                    {portalServices.map(({ icon: Icon, title, description }) => (
                        <article key={title} className="rounded-2xl border border-gray-200 bg-[#Fbfaf8] p-6 md:p-7">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-regx-orange shadow-sm">
                                <Icon className="h-5 w-5" />
                            </div>
                            <h3 className="mt-5 text-lg font-bold text-gray-900">{title}</h3>
                            <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
                        </article>
                    ))}
                </div>

                <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-orange-100 bg-orange-50/70 p-6 text-center sm:flex-row sm:text-left">
                    <p className="max-w-2xl text-sm leading-6 text-gray-700">
                        Tell us how your organization works and we&apos;ll discuss a portal scope that fits your sports and event workflow.
                    </p>
                    <Link
                        to="/contact"
                        className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-gray-800 shadow-sm transition-colors hover:bg-gray-50"
                    >
                        Discuss a custom portal <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                </div>
            </div>
        </section>
    );
};

export default CustomDashboard;

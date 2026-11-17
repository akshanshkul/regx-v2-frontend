import React, { useEffect } from 'react';
import { Scale, ClipboardCheck, Megaphone, UserPlus, ArrowRight, Swords } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Tournament operations: the jobs done on the day, not while setting up.
 *
 * Each card is one job with its own workflow.
 *
 * "Sport only" marks the ones that make sense only for a sport event, where a
 * form carries weight categories and the like.
 */
const CARDS = [
    {
        key: 'weigh-in',
        title: 'Weigh-in',
        summary: 'Record each competitor’s weight on the day and move them to the right category.',
        icon: Scale,
        tone: 'bg-blue-50 text-blue-600',
        to: '/operations/weigh-in',
        sportOnly: true,
    },
    {
        key: 'attendance',
        title: 'Attendance',
        summary: 'Mark who has arrived, per event, from the registration list.',
        icon: ClipboardCheck,
        tone: 'bg-emerald-50 text-emerald-600',
        to: '/operations/attendance',
    },
    {
        key: 'broadcast',
        title: 'Broadcast message',
        summary: 'Email everyone registered — across all events, one event, or one form.',
        icon: Megaphone,
        to: '/dashboard/broadcast',
        tone: 'bg-amber-50 text-amber-600',
    },
    {
        key: 'offline',
        title: 'Offline registration',
        summary: 'Register someone at the desk and take payment on the spot.',
        icon: UserPlus,
        tone: 'bg-violet-50 text-violet-600',
        to: '/operations/offline',
    },
    {
        key: 'fixtures',
        title: 'Fixtures',
        summary: 'Create independent fixture collections, upload players, and record match results.',
        icon: Swords,
        tone: 'bg-orange-50 text-regx-orange',
        to: '/operations/fixtures',
    },
];

const Operations = () => {
    useEffect(() => {
        document.title = 'Tournament operations';
    }, []);

    return (
        <div className="max-w-8xl mx-auto pb-16">
            <div className="mb-8">
                <h1 className="text-xl font-bold text-gray-900">
                    Tournament operations
                </h1>
                <p className="text-xs text-gray-500 mt-1">Everything that happens on the day, in one place.</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {CARDS.map((card) => {
                    const Icon = card.icon;

                    const button = (
                        <Link
                            to={card.to}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                            {card.cta ?? 'Go'} <ArrowRight className="w-4 h-4" />
                        </Link>
                    );

                    return (
                        <section
                            key={card.key}
                            className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col hover:border-regx-orange/40 hover:shadow-md transition"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className={`w-9 h-9 rounded-xl grid place-items-center ${card.tone}`}>
                                    <Icon className="w-4 h-4" />
                                </div>

                                {card.sportOnly && (
                                    <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-[10px] font-semibold tracking-wide">
                                        SPORT EVENTS
                                    </span>
                                )}
                            </div>

                            <h2 className="mt-3 text-sm font-bold text-gray-900">
                                {card.title}
                            </h2>

                            <p className="mt-1 text-xs leading-5 text-gray-500 flex-1">
                                {card.summary}
                            </p>

                            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                                {button}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
};

export default Operations;

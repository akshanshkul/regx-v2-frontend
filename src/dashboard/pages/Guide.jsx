import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    BookOpen, Calendar, FileText, CreditCard, Share2, Users, ClipboardCheck, Scale, Swords, IdCard,
    Megaphone, BarChart3, Shield, Rocket, Search, ChevronRight, Lightbulb, X,
} from 'lucide-react';

/**
 * How to use RegX, in the order an event actually happens: set up, take
 * registrations, run the day, then follow up. Each section is a few numbered
 * steps with the screen to open, and a tip where people usually get stuck.
 *
 * Plain content in one list, so adding a step is adding a line here.
 */
const SECTIONS = [
    {
        id: 'start',
        icon: Rocket,
        title: 'Quick start',
        summary: 'From nothing to a live registration link in five steps.',
        link: { to: '/events/create', label: 'Create an event' },
        steps: [
            ['Create the event', 'Sidebar → Create Event. Give it a name, date, venue and the event type (choose a sport type for tournaments).'],
            ['Create a form', 'Open the event → Forms → New form. Start from a template (for example Armwrestling or Cricket) or from a blank form.'],
            ['Set the fee', 'In the form, open the Fees tab. Add a flat registration fee, or price categories. Turn on online payment if you want to collect through Razorpay.'],
            ['Publish', 'Click Publish at the top of the form. The form gets a public link such as /form/abc123.'],
            ['Share it', 'Next to the link, click QR to download a QR code with RegX in the middle. Print it or post it with the link.'],
        ],
        tip: 'You can create a draft and keep editing it. Participants only see the form once it is published.',
    },
    {
        id: 'events',
        icon: Calendar,
        title: 'Events',
        summary: 'An event holds your forms, dates and venue.',
        link: { to: '/dashboard/my-events', label: 'My events' },
        steps: [
            ['Add the details', 'Name, date, venue, state and a short description. These show at the top of every form under the event.'],
            ['Pick the type', 'The event type decides which tools appear. Sport events get weigh-in, fixtures and category lists.'],
            ['Add logos and a banner', 'Upload a logo and banner on the event. A form can hide them in its own Details tab if you do not want them on one form.'],
            ['Open the event page', 'From My Events, open an event to see its forms, registrations and a quick summary.'],
        ],
    },
    {
        id: 'forms',
        icon: FileText,
        title: 'Building a form',
        summary: 'Fields, sections, rules, fees, look and sharing.',
        link: { to: '/dashboard/forms', label: 'Forms' },
        steps: [
            ['Choose a starting point', 'New form → pick a template or start blank. You can also create a form from one you already made.'],
            ['Add fields', 'On the Fields tab, click a section header first (it says "New fields go here"), then click a field type to add it into that section.'],
            ['Reorder and edit', 'Drag a field by its handle to move it. Click a field to change its label, options, whether it is required, and more.'],
            ['Add rules', 'On the Rules tab, show or hide fields, pick a category or set a fee from the answers. For example Gender → Age → Weight gives the category and price.'],
            ['Set fees', 'Fees tab: a flat fee, or category prices. Payment can be online, cash at the desk, or off.'],
            ['Choose a look', 'Theme tab: pick one of the themes, or no theme. The preview shows how participants see it.'],
            ['Registration number', 'Details tab → Registration number. Use a pattern such as KAS-{YY}-{SEQ:4}. Leave it blank for REG-XXXXXXXX.'],
            ['Publish', 'Check the Preview tab, then Publish. Changing a published form needs publishing again.'],
        ],
        tip: 'Use the Preview tab to fill the form in yourself before you share it.',
    },
    {
        id: 'registrations',
        icon: Users,
        title: 'Registrations',
        summary: 'See, search, edit and manage everyone who signed up.',
        link: { to: '/events/registrations', label: 'Registrations' },
        steps: [
            ['Open the list', 'Sidebar → Registrations, then open a form. Search by name, reference, email or phone; filter by payment or category.'],
            ['Open a row', 'Click a row to see every answer, including team members and uploaded photos or files.'],
            ['Edit details', 'The pencil icon (or "Edit details" inside the row) opens the participant’s own form with their answers. Save changes, or use Save at any step.'],
            ['Settle an unpaid fee', 'In Edit details, an unpaid registration shows Check Razorpay, Paid in cash and Waive fee.'],
            ['Remove one', 'The bin icon hides a registration. It is not deleted; use View hidden to see and restore it.'],
            ['Approve or reject', 'If the form asks for approval, use the tick and cross buttons, or the queue tabs at the top.'],
            ['Export', 'Excel, PDF and Print are at the top. Excel and the weigh-in sheet list only people whose fee is settled.'],
        ],
        tip: 'Hide unpaid clears every pending, failed or abandoned registration in one click. They can be restored.',
    },
    {
        id: 'payments',
        icon: CreditCard,
        title: 'Payments',
        summary: 'Online payments, cash, waived fees and the payment report.',
        link: { to: '/dashboard/payments', label: 'Payments' },
        steps: [
            ['Online payments', 'Turn on online payment in the form’s Fees tab. Participants pay with Razorpay; the registration is marked paid automatically.'],
            ['Cash at the desk', 'Mark a registration Paid in cash from Edit details, or register people at the desk with Offline registration.'],
            ['Waive a fee', 'Waive fee in Edit details marks it settled with no money. It is not counted as revenue.'],
            ['Check stuck payments', 'On the Payments page, Check pending (10) asks Razorpay about 10 waiting registrations at a time. Paid ones are settled; unpaid ones become failed; ones that never started and are over 30 minutes old become abandoned.'],
            ['Read the report', 'Reports & Exports → Payments tab shows billed, collected, still to collect and waived, and how each was paid.'],
            ['Payouts', 'Payouts is where you request money to your bank account.'],
        ],
        tip: 'A payment stays on the Payments page even if its registration was hidden.',
    },
    {
        id: 'share',
        icon: Share2,
        title: 'Sharing and QR codes',
        summary: 'Get people to the form.',
        steps: [
            ['Copy the link', 'The published form’s link sits under its name, for example /form/abc123. Open it in a new tab to see what participants see.'],
            ['Download the QR', 'Click QR next to the link. You get a PNG with a RegX mark in the middle. Test it with a phone before printing.'],
            ['Broadcast a message', 'Operations → Broadcast message emails everyone registered, across events, one event or one form.'],
        ],
    },
    {
        id: 'desk',
        icon: ClipboardCheck,
        title: 'On the day: attendance and desk',
        summary: 'Mark who arrived and register people at the table.',
        link: { to: '/operations/attendance', label: 'Attendance' },
        steps: [
            ['Take attendance', 'Operations → Attendance, choose a form. Click Mark present for a simple tick.'],
            ['Capture a photo', 'Click Photo to use the camera, which also marks them present. Retake replaces it; click the thumbnail to enlarge.'],
            ['Undo', 'Undo takes the mark back if you ticked the wrong person.'],
            ['Register at the desk', 'Operations → Offline registration. Fill the form for the person, then choose cash or online payment.'],
        ],
        tip: 'Use the Present and Not arrived tabs to see who is still missing.',
    },
    {
        id: 'weighin',
        icon: Scale,
        title: 'Weigh-in',
        summary: 'Record each competitor’s real weight.',
        link: { to: '/operations/weigh-in', label: 'Weigh-in' },
        steps: [
            ['Open the desk', 'Operations → Weigh-in → pick a sport form → Start weigh-in.'],
            ['Find the player', 'Search by name, email or mobile. The search waits two seconds after you stop typing.'],
            ['Enter the weight', 'Click Weigh in, enter the weight in kg and save. If it does not fit the class they entered, you are warned and can still correct their class.'],
            ['Print', 'The weigh-in sheet on Reports prints the saved weights next to each competitor.'],
        ],
    },
    {
        id: 'fixtures',
        icon: Swords,
        title: 'Fixtures and results',
        summary: 'Draw brackets, record winners and run the tables.',
        steps: [
            ['Open the fixture engine', 'On the registrations page of a sport form, click Create fixtures.'],
            ['Create independent fixtures', 'Tournament Operations → Fixtures lets you create a collection with the same fixture types, upload a player sheet with Name and optional Player ID columns, then create and score fixtures without using registration forms.'],
            ['Choose the fixture type', 'Pick the type (for example double elimination) and Save. It locks once a category is started.'],
            ['Start a category', 'Every category (such as "Female · Junior · 45 kg · Left") is a card. Start it to draw the bracket. Only people whose fee is paid or waived, and approved where needed, are drawn.'],
            ['Record winners', 'View a category and tick the winner of each match. Clear result undoes one.'],
            ['Print', 'PDF lists players and matches; Tie sheet prints the bracket on A5 landscape; Ranking lists 1st, 2nd, 3rd and so on once the final is decided.'],
            ['Complete a category', 'When every match has a result, Complete locks the category for good. It shows in yellow.'],
            ['Show it in the hall', 'Public screen gives a link for a big screen at the venue. It needs no login.'],
        ],
        tip: 'Redraw makes a new bracket from everyone registered now. It deletes the existing draw, so use it before any result is recorded.',
    },
    {
        id: 'certificates',
        icon: IdCard,
        title: 'Certificates and ID cards',
        summary: 'Design once, make one for everyone.',
        link: { to: '/dashboard/certificates', label: 'ID Cards & Certificates' },
        steps: [
            ['Create a collection', 'ID Cards & Certificates → create a collection and attach it to a form.'],
            ['Upload the artwork', 'Upload the certificate or card background.'],
            ['Place the fields', 'Drag fields such as name, category, age category, weight and photo onto the artwork. Save the layout.'],
            ['Choose per player or per category', 'Use the "Certificates per" selector: one certificate per player listing all their categories, or one for each category.'],
            ['Generate and download', 'Generate makes them all. Download gets the whole batch as one file. A photo that cannot be read is skipped; the rest still print.'],
        ],
        tip: 'Saving a layout needs the certificate service to be running. If it says the template size could not be read, the service is not reachable.',
    },
    {
        id: 'reports',
        icon: BarChart3,
        title: 'Reports and exports',
        summary: 'Numbers and files for your records.',
        link: { to: '/dashboard/reports', label: 'Reports' },
        steps: [
            ['Pick a form', 'Reports & Exports → choose the form at the top.'],
            ['Overview', 'Registrations, paid, collected, daily sign-ups, payment status and popular categories.'],
            ['Answer insights', 'How people answered each question.'],
            ['Payments', 'Appears on forms that take payment: collected, still to collect, waived, cash and online.'],
            ['Download', 'Excel, PDF, Print, Category list and Weigh-in sheet are in the header.'],
        ],
    },
    {
        id: 'team',
        icon: Shield,
        title: 'Team and permissions',
        summary: 'Invite helpers and control what they can do.',
        link: { to: '/dashboard/team-permissions', label: 'Team & Permissions' },
        steps: [
            ['Invite someone', 'Team & Permissions → Invite member. Enter their email and choose a role: admin, manager or custom.'],
            ['Custom access', 'A custom role lets you choose create events, create forms, billing, and which events and forms they can see.'],
            ['They accept', 'They sign in with that email and accept the invitation, then switch into your account.'],
            ['Change or pause', 'The owner or an admin can change a role, suspend or remove anyone.'],
            ['Give up access', 'A member can lower their own access with Lower my access. Getting more needs the owner or an admin.'],
        ],
    },
];

const Guide = () => {
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(SECTIONS[0].id);

    useEffect(() => {
        document.title = 'RegX guide';
    }, []);

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();

        if (q === '') return SECTIONS;

        return SECTIONS.filter((section) =>
            [section.title, section.summary, section.tip ?? '', ...section.steps.flat()].join(' ').toLowerCase().includes(q)
        );
    }, [query]);

    const jump = (id) => {
        setActive(id);
        document.getElementById(`guide-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="max-w-6xl mx-auto pb-16">
            <div className="mb-8">
                <div className="flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-regx-orange" />
                    <h1 className="text-2xl font-bold text-gray-900 font-display">RegX guide</h1>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                    How to use RegX, step by step, in the order an event happens.
                </p>

                <div className="relative mt-5 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search the guide… (payment, QR, weigh-in)"
                        aria-label="Search the guide"
                        className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-regx-orange/20 focus:border-regx-orange"
                    />
                    {query && (
                        <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
                <nav className="hidden lg:block self-start sticky top-24" aria-label="Guide sections">
                    <ul className="space-y-0.5">
                        {SECTIONS.map(({ id, title, icon: Icon }) => (
                            <li key={id}>
                                <button
                                    type="button"
                                    onClick={() => jump(id)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                                        active === id ? 'bg-regx-orange/10 text-regx-orange font-semibold' : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    {title}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="space-y-6 min-w-0">
                    {shown.length === 0 && (
                        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center text-sm text-gray-500">
                            Nothing in the guide matches “{query}”. Try a shorter word.
                        </div>
                    )}

                    {shown.map(({ id, icon: Icon, title, summary, steps, tip, link }) => (
                        <section key={id} id={`guide-${id}`} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden scroll-mt-24">
                            <header className="flex items-start gap-3 px-6 py-5 border-b border-gray-100">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 text-regx-orange grid place-items-center shrink-0">
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                                    <p className="text-sm text-gray-500">{summary}</p>
                                </div>
                                {link && (
                                    <Link
                                        to={link.to}
                                        className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:border-regx-orange hover:text-regx-orange"
                                    >
                                        {link.label} <ChevronRight className="w-3.5 h-3.5" />
                                    </Link>
                                )}
                            </header>

                            <ol className="px-6 py-5 space-y-4">
                                {steps.map(([heading, text], index) => (
                                    <li key={heading} className="flex gap-4">
                                        <span className="w-7 h-7 rounded-full bg-gray-900 text-white text-xs font-bold grid place-items-center shrink-0 mt-0.5">
                                            {index + 1}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900">{heading}</p>
                                            <p className="mt-0.5 text-sm text-gray-600 leading-relaxed">{text}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>

                            {tip && (
                                <div className="mx-6 mb-5 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
                                    <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                                    <p>{tip}</p>
                                </div>
                            )}
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Guide;

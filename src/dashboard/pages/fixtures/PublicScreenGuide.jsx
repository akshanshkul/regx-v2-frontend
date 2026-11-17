import React, { useEffect, useState } from 'react';
import { Copy, ExternalLink, Gavel, LayoutGrid, Loader2, MonitorPlay, Radio, RotateCcw, ShieldCheck, Trophy, Tv, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { TableLinks } from './TableSettings';

/** A link with Copy and Open beside it. */
const LinkRow = ({ label, url }) => {
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            toast.success(`${label} link copied`);
        } catch {
            toast.error('Could not copy — select the link and copy it');
        }
    };

    return (
        <div className="flex items-center gap-2">
            <input
                readOnly
                value={url}
                onFocus={(e) => e.target.select()}
                aria-label={`${label} link`}
                className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 bg-gray-50"
            />
            <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange shrink-0">
                <Copy className="w-4 h-4" /> Copy
            </button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 shrink-0">
                <ExternalLink className="w-4 h-4" /> Open
            </a>
        </div>
    );
};

/** The referee link for each table, and a way to replace them all. */
const RefereeLinks = ({ formId, tables }) => {
    const [token, setToken] = useState(null);
    const [error, setError] = useState(null);
    const [renewing, setRenewing] = useState(false);

    useEffect(() => {
        api.get(`/forms/${formId}/fixture/referee`)
            .then((payload) => setToken(payload.token))
            .catch((e) => setError(e?.response?.data?.messages?.error || 'Could not load the referee links'));
    }, [formId]);

    const renew = async () => {
        if (!window.confirm('Make new referee links? Every link you have handed out stops working straight away.')) return;

        setRenewing(true);

        try {
            const payload = await api.post(`/forms/${formId}/fixture/referee/renew`);
            setToken(payload.token);
            toast.success('New referee links made — send them to the referees again');
        } catch (e) {
            toast.error(e?.response?.data?.messages?.error || 'Could not make new links');
        } finally {
            setRenewing(false);
        }
    };

    if (error) return <p className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs p-3">{error}</p>;
    if (!token || tables === null) return <p className="flex items-center gap-2 text-xs text-gray-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</p>;
    if (tables.count === 0) {
        return <p className="rounded-lg bg-gray-50 border border-gray-200 text-xs p-3">Set up tables first — each referee link belongs to one table.</p>;
    }

    const base = `${window.location.origin}/ref/${token}`;

    return (
        <div className="space-y-2">
            {Array.from({ length: Math.min(tables.count, 12) }, (_, i) => i + 1).map((t) => (
                <LinkRow key={t} label={`Referee table ${t}`} url={`${base}?table=${t}`} />
            ))}
            <button
                type="button"
                onClick={renew}
                disabled={renewing}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
            >
                {renewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Replace links
            </button>
        </div>
    );
};

const Section = ({ icon: Icon, title, children }) => (
    <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <span className="w-7 h-7 rounded-lg bg-orange-50 text-regx-orange grid place-items-center shrink-0"><Icon className="w-4 h-4" /></span>
            {title}
        </h3>
        <div className="space-y-3 text-sm text-gray-600 leading-relaxed">{children}</div>
    </section>
);

const PARAMS = [
    ['table', '1, 2, 3 …', 'Shows that one table instead of the whole hall.'],
    ['showtype', 'normal · livestream', 'normal (default) is a full screen for a monitor. livestream is a see-through overlay for a video stream.'],
    ['view', 'banner · scorebug · ticker', 'Overlay style, for livestream. banner is a lower third with the two players either side of the table badge; scorebug a compact box in the corner; ticker a thin strip along the edge.'],
    ['color', 'classic · gold · green · purple · orange', 'The two sides’ colours: red/blue, gold/slate, green/teal, purple/pink, orange/navy.'],
    ['pos', 'bottom · top', 'Where the overlay sits on the picture (livestream). Default bottom.'],
];

/**
 * Everything about the public screen in one place: what it shows, the links
 * to copy for the hall, for a single table and for a stream, and how to use
 * them.
 */
const PublicScreenGuide = ({ formId, publicUrl, anyStarted, onClose }) => {
    const [tables, setTables] = useState(null); // { count, mode } once loaded

    useEffect(() => {
        api.get(`/forms/${formId}/fixture/tables`)
            .then((payload) => setTables(payload.tables ?? { count: 0 }))
            .catch(() => setTables({ count: 0 }));
    }, [formId]);

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8"
                role="dialog"
                aria-modal="true"
                aria-label="Public screen"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-900 text-white flex items-center justify-center shrink-0">
                            <MonitorPlay className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900 text-lg">Public screen</h2>
                            <p className="text-xs text-gray-500">The live draw for the hall, each table, and your stream. No sign-in needed to view it.</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
                        <X className="w-5 h-5" />
                    </button>
                </header>

                <div className="p-5 space-y-7 max-h-[75vh] overflow-y-auto">
                    {!anyStarted && (
                        <p className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3">
                            No category has been started yet, so the screen has nothing to show. The links already work — start a category and it appears.
                        </p>
                    )}

                    <Section icon={MonitorPlay} title="The hall screen">
                        <p>
                            One screen for the whole event: every started category, the match being pulled in each, and what comes next.
                            When tables are set up it shows the hall table by table instead — who is on each table, and the line of matches waiting for one.
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Put it on a TV or projector at the venue, or share it with spectators and coaches.</li>
                            <li>It updates by itself every 30 seconds — results recorded on the fixture page or by scanning show up without anyone touching it.</li>
                            <li>Fouls, byes and table numbers appear as they are recorded.</li>
                        </ul>
                        <LinkRow label="Hall screen" url={publicUrl} />
                    </Section>

                    <Section icon={LayoutGrid} title="One table">
                        <p>
                            The same link with <code className="px-1 rounded bg-gray-100 text-gray-800">?table=2</code> shows just that table: big names, fouls, the round and category, and who plays there next.
                            Put a monitor or tablet beside each table so the pullers and the referee see who is called. It refreshes every 8 seconds.
                        </p>
                        {tables === null ? (
                            <p className="flex items-center gap-2 text-xs text-gray-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking the tables…</p>
                        ) : tables.count > 0 ? (
                            <div className="space-y-2">
                                {Array.from({ length: Math.min(tables.count, 12) }, (_, i) => i + 1).map((t) => (
                                    <LinkRow key={t} label={`Table ${t}`} url={`${publicUrl}?table=${t}`} />
                                ))}
                                {tables.count > 12 && <p className="text-xs text-gray-500">…and so on up to table {tables.count}: change the number at the end of the link.</p>}
                                {tables.mode === 'manual' && (
                                    <p className="text-xs text-gray-500">Tables are set <strong>By category</strong>: a table shows matches only once a category is given to it in Table settings.</p>
                                )}
                            </div>
                        ) : (
                            <p className="rounded-lg bg-gray-50 border border-gray-200 text-xs p-3">
                                Tables are not set up yet. Open <strong>Tables</strong> on this page, set how many the hall has, and the links for each table appear here.
                            </p>
                        )}
                    </Section>

                    <Section icon={Radio} title="Live stream overlay">
                        <p>
                            For a broadcast: add <code className="px-1 rounded bg-gray-100 text-gray-800">&amp;showtype=livestream</code> to a table link and you get a TV score graphic on a see-through background, to lay over your camera picture.
                        </p>
                        <ol className="list-decimal pl-5 space-y-1">
                            <li>In OBS (or Streamlabs, vMix…) add a <strong>Browser</strong> source.</li>
                            <li>Paste the overlay link below as its URL, and set the size to your canvas — 1920 × 1080 for full HD.</li>
                            <li>Place it above the camera. Nothing else is needed: the page background is already transparent.</li>
                        </ol>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Banner</strong> — a lower third: the two pullers in coloured bars either side of the table badge, with LIVE, the round and the category underneath.</li>
                            <li><strong>Score bug</strong> — a compact box in the corner: the table, a row per puller with fouls (and score, if you record scores), and who is next.</li>
                            <li><strong>Ticker</strong> — a thin strip along the bottom or top edge.</li>
                        </ul>
                        <p>When the table is free the graphic switches to <strong>NEXT UP</strong> with the next pair, then back to LIVE when they are called.</p>
                        {tables?.count > 0 ? (
                            <div className="rounded-xl border border-gray-200 p-4">
                                <TableLinks publicUrl={publicUrl} count={tables.count} />
                            </div>
                        ) : (
                            tables !== null && <p className="rounded-lg bg-gray-50 border border-gray-200 text-xs p-3">Set up tables first — an overlay follows one table.</p>
                        )}
                    </Section>

                    <Section icon={Trophy} title="Results screen — “That’s a wrap”">
                        <p>
                            The podium of every completed category — 1st, 2nd and 3rd — on a timer that pages through them all, for the hall screen during prize giving and at the end of the day. When you have chosen what groups people on Reports → Results (club, district…), the medal table is shown beside them.
                        </p>
                        <LinkRow label="Results screen" url={`${publicUrl}?show=results`} />
                        <p className="text-xs text-gray-500">
                            Each table&apos;s own screen and stream overlay also shows <strong>WINNER</strong> for about 20 seconds after a match is decided on it, then moves on to the next pair.
                        </p>
                    </Section>

                    <Section icon={Gavel} title="Referee links">
                        <p>
                            A link per table for the referee's phone. It shows the match on that table, with big buttons to record the winner (asked twice, so a stray tap never decides a match) and the fouls. The table moves on to its next match by itself, and every result is recorded in History as <em>Referee · Table N</em>.
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>No sign-in. Unlike the screens above, these links <strong>can record results</strong> — give each one only to that table's referee.</li>
                            <li>A link opens its own table only: it cannot touch any other match.</li>
                            <li>Lost a phone, or the event is over? <strong>Replace links</strong> — every old referee link stops working at once.</li>
                        </ul>
                        <RefereeLinks formId={formId} tables={tables} />
                    </Section>

                    <Section icon={Tv} title="Link options">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50 text-gray-500 text-left">
                                    <tr>
                                        <th className="px-3 py-2 font-semibold">Option</th>
                                        <th className="px-3 py-2 font-semibold">Values</th>
                                        <th className="px-3 py-2 font-semibold">What it does</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {PARAMS.map(([name, values, text]) => (
                                        <tr key={name} className="align-top">
                                            <td className="px-3 py-2 font-mono text-gray-900">{name}</td>
                                            <td className="px-3 py-2 font-mono text-gray-600 whitespace-nowrap">{values}</td>
                                            <td className="px-3 py-2 text-gray-600">{text}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs">
                            Example: <code className="px-1 rounded bg-gray-100 text-gray-800 break-all">{publicUrl}?table=1&amp;showtype=livestream&amp;view=scorebug&amp;color=gold</code>
                        </p>
                    </Section>

                    <Section icon={ShieldCheck} title="Privacy">
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Anyone with the link can watch; nobody can change anything through it.</li>
                            <li>It shows names, categories and results only — never registration numbers, emails or phone numbers.</li>
                        </ul>
                    </Section>
                </div>

                <footer className="flex justify-end p-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-white">
                        Close
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default PublicScreenGuide;

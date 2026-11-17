import React, { useEffect, useState } from 'react';
import { CalendarClock, Loader2, Lock, Unlock } from 'lucide-react';

const pad = (n) => String(n).padStart(2, '0');

/** "2026-11-02 23:59:59" from the server, as a Date in the browser's clock. */
const fromServer = (value) => (value ? new Date(String(value).replace(' ', 'T')) : null);

/** A Date as the server stores it: "YYYY-MM-DD HH:MM:SS". */
const toServer = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const describe = (date) =>
    date.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/**
 * Whether the form takes registrations, and when it stops by itself.
 *
 *   Accepting registrations — a switch: off closes the form at once.
 *   Close automatically     — at midnight at the end of a chosen day, or at an
 *                             exact date and time. Nothing has to run at that
 *                             moment: from then on the form simply refuses new
 *                             registrations and shows "Registration has closed".
 *
 * Saved straight away; the public form says why it is closed.
 */
const RegistrationWindow = ({ form, onChange }) => {
    const isActive = Number(form?.is_active ?? 1) === 1;
    const closesAt = fromServer(form?.closes_at);
    const passed = closesAt !== null && closesAt.getTime() < Date.now();

    const [mode, setMode] = useState('midnight');
    const [day, setDay] = useState(today());
    const [exact, setExact] = useState('');
    const [busy, setBusy] = useState(null);

    // Start the pickers from what is saved.
    useEffect(() => {
        if (!closesAt) return;

        const atMidnight = closesAt.getHours() === 23 && closesAt.getMinutes() === 59;
        setMode(atMidnight ? 'midnight' : 'exact');
        setDay(`${closesAt.getFullYear()}-${pad(closesAt.getMonth() + 1)}-${pad(closesAt.getDate())}`);
        setExact(`${closesAt.getFullYear()}-${pad(closesAt.getMonth() + 1)}-${pad(closesAt.getDate())}T${pad(closesAt.getHours())}:${pad(closesAt.getMinutes())}`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form?.closes_at]);

    const run = async (key, patch) => {
        setBusy(key);
        try {
            await onChange(patch);
        } finally {
            setBusy(null);
        }
    };

    const schedule = () => {
        // Midnight: the very end of the chosen day, so the whole day counts.
        const at = mode === 'midnight' ? new Date(`${day}T23:59:59`) : new Date(exact);

        if (Number.isNaN(at.getTime())) return;
        if (at.getTime() < Date.now() && !window.confirm('That time has already passed, so the form closes straight away. Continue?')) return;

        run('schedule', { closesAt: toServer(at) });
    };

    const status = !isActive
        ? { tone: 'bg-red-50 border-red-200 text-red-800', icon: Lock, text: 'Closed — not accepting registrations.' }
        : passed
          ? { tone: 'bg-red-50 border-red-200 text-red-800', icon: Lock, text: `Closed automatically on ${describe(closesAt)}.` }
          : closesAt
            ? { tone: 'bg-amber-50 border-amber-200 text-amber-800', icon: CalendarClock, text: `Open — closes automatically on ${describe(closesAt)}.` }
            : { tone: 'bg-green-50 border-green-200 text-green-800', icon: Unlock, text: 'Open — accepting registrations.' };

    const StatusIcon = status.icon;
    const field = 'border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-regx-orange';

    return (
        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2"><CalendarClock className="w-4 h-4 text-regx-orange" /> Registration window</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Close the form now, or let it close by itself at midnight on a day you choose.</p>
                </div>

                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none">
                    Accepting registrations
                    <button
                        type="button"
                        role="switch"
                        aria-checked={isActive}
                        disabled={busy !== null}
                        onClick={() => {
                            if (isActive && !window.confirm('Close this form now? Nobody can register until you open it again.')) return;
                            run('active', { isActive: !isActive });
                        }}
                        className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-60 ${isActive ? 'bg-green-600' : 'bg-gray-300'}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-5' : ''}`} />
                    </button>
                    {busy === 'active' && <Loader2 className="w-4 h-4 animate-spin" />}
                </label>
            </div>

            <p className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${status.tone}`}>
                <StatusIcon className="w-4 h-4 shrink-0" /> {status.text}
            </p>

            {isActive && passed && (
                <p className="text-xs text-gray-600">To take registrations again, remove the closing time or move it later.</p>
            )}

            <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-800">Close automatically</p>
                <div className="flex flex-wrap items-center gap-2">
                    <select value={mode} onChange={(e) => setMode(e.target.value)} className={field} aria-label="When to close">
                        <option value="midnight">At midnight at the end of</option>
                        <option value="exact">At an exact date and time</option>
                    </select>

                    {mode === 'midnight' ? (
                        <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={field} aria-label="Day to close at midnight" />
                    ) : (
                        <input type="datetime-local" value={exact} onChange={(e) => setExact(e.target.value)} className={field} aria-label="Date and time to close" />
                    )}

                    <button
                        type="button"
                        onClick={schedule}
                        disabled={busy !== null || (mode === 'midnight' ? !day : !exact)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                    >
                        {busy === 'schedule' && <Loader2 className="w-4 h-4 animate-spin" />} {closesAt ? 'Change' : 'Set'}
                    </button>

                    {closesAt && (
                        <button
                            type="button"
                            onClick={() => run('clear', { closesAt: '' })}
                            disabled={busy !== null}
                            className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                        >
                            {busy === 'clear' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove'}
                        </button>
                    )}
                </div>
                <p className="text-[11px] text-gray-500">
                    Midnight means the end of that day (23:59:59), so registrations are taken all day. Nothing needs to be running at that moment — from then on the form shows “Registration has closed”.
                </p>
            </div>
        </section>
    );
};

export default RegistrationWindow;

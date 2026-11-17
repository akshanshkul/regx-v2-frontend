import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScanLine, Loader2, Trophy, AlertTriangle, CheckCircle2, X, Swords, Camera } from 'lucide-react';
import api from '../../../services/api';
import { messageOf } from './fixtureData';
import CameraScanner from './CameraScanner';

/**
 * Recording results by scanning the winner's registration number.
 *
 * Built for a USB or Bluetooth barcode / QR scanner, which behaves as a
 * keyboard: it types what the code holds and presses Enter. So the box keeps
 * focus, Enter submits, and the box clears itself for the next scan. Typing a
 * number by hand works the same way.
 *
 * The server finds the match waiting for that registration across every
 * started category. One match is recorded straight away. Several — a player
 * entered in more than one category — sound a beep and put the matches on
 * screen to choose from (click, or press 1–9); nothing is recorded until then.
 *
 * compact: a slim box that sits inside another bar (the Category bar on the
 * fixture page). Results and the match picker drop down under it instead of
 * growing the bar, and a win clears itself after a few seconds.
 *
 * keepFocus: on a page of its own (the scan station) a click anywhere that is
 * not a button or a field puts the cursor back in the box, so the scanner is
 * never typing into nothing. historySize: how many recent scans to list.
 */
const ResultScanner = ({ formId, enabled, onRecorded, compact = false, keepFocus = false, historySize = 8, camera = false }) => {
    const input = useRef(null);
    const [code, setCode] = useState('');
    // The device's camera reading codes instead of (or as well as) a scanner.
    const [cameraOn, setCameraOn] = useState(false);
    const cameraOnRef = useRef(false);
    cameraOnRef.current = cameraOn;
    const [busy, setBusy] = useState(false);
    const [choice, setChoice] = useState(null); // { reference, message, matches }
    const [last, setLast] = useState(null); // { tone: 'ok' | 'warn' | 'error', title, detail }
    // Kept on this device for a day, so a reload does not lose what was scanned.
    // Tagged with its form, so switching forms never writes one form's list
    // under the other's name.
    const [stored, setStored] = useState(() => ({ formId, items: loadHistory(formId) }));
    const history = stored.formId === formId ? stored.items : [];

    useEffect(() => {
        if (stored.formId !== formId) setStored({ formId, items: loadHistory(formId) });
    }, [formId, stored.formId]);

    useEffect(() => {
        saveHistory(stored.formId, stored.items);
    }, [stored]);

    const setHistory = useCallback(
        (update) => setStored((s) => ({ formId: s.formId, items: typeof update === 'function' ? update(s.items) : update })),
        []
    );

    const focus = useCallback(() => {
        // While the camera reads codes the box is left alone: on a phone,
        // focusing it would open the keyboard over the camera.
        if (cameraOnRef.current) return;

        // After React has painted, so a just-closed picker does not steal it back.
        requestAnimationFrame(() => input.current?.focus());
    }, []);

    useEffect(() => {
        if (enabled) focus();
    }, [enabled, focus]);

    // In the slim box a win is a passing confirmation, gone after a moment so
    // the panel does not sit over the cards. Warnings stay until dismissed.
    useEffect(() => {
        if (!compact || last?.tone !== 'ok') return undefined;

        const timer = setTimeout(() => setLast(null), 6000);
        return () => clearTimeout(timer);
    }, [compact, last]);

    useEffect(() => {
        if (!keepFocus || !enabled) return undefined;

        const onClick = (e) => {
            if (!e.target.closest('button, a, input, select, textarea, [role="dialog"], [role="alertdialog"]')) focus();
        };

        document.addEventListener('click', onClick);
        window.addEventListener('focus', focus);

        return () => {
            document.removeEventListener('click', onClick);
            window.removeEventListener('focus', focus);
        };
    }, [keepFocus, enabled, focus]);

    // Every scan this device sent, kept up to HISTORY_LIMIT whatever is shown.
    const remember = (entry) => setHistory((items) => [{ ...entry, at: new Date() }, ...items].slice(0, HISTORY_LIMIT));

    const settle = (payload) => {
        if (payload.status === 'recorded') {
            const m = payload.match;
            const result = {
                tone: 'ok',
                code: payload.reference,
                title: `${m.player.name} won`,
                detail: `${payload.reference} · ${m.category} · ${m.round} — beat ${m.opponent.name}`,
            };

            beep('ok');
            setLast(result);
            remember(result);
            setChoice(null);
            onRecorded?.(m);
            return;
        }

        if (payload.status === 'choose') {
            beep('choose');
            setChoice({ reference: payload.reference, message: payload.message, matches: payload.matches ?? [] });
            setLast(null);
            return;
        }

        const result = { tone: 'warn', code: payload.reference ?? null, title: payload.reference ?? 'Not recorded', detail: payload.message };

        beep('error');
        setLast(result);
        remember(result);
        setChoice(null);
    };

    const send = async (body) => {
        setBusy(true);

        try {
            settle(await api.post(`/forms/${formId}/fixture/scan`, body));
        } catch (error) {
            const result = { tone: 'error', code: body.code ?? null, title: 'Could not record', detail: messageOf(error, 'Something went wrong. Scan again.') };

            beep('error');
            setLast(result);
            remember(result);
            setChoice(null);
        } finally {
            setBusy(false);
            focus();
        }
    };

    const submit = (e) => {
        e.preventDefault();

        const scanned = code.trim();
        if (!scanned || busy) return;

        setCode('');
        send({ code: scanned });
    };

    const pick = useCallback(
        (match) => {
            if (!choice || busy) return;
            send({ code: choice.reference, matchId: match.matchId, category: match.category });
        },
        [choice, busy] // eslint-disable-line react-hooks/exhaustive-deps
    );

    // While choosing: 1–9 picks, Escape cancels. A scan into the box (focus is
    // kept there) abandons the choice and starts on the new code instead.
    useEffect(() => {
        if (!choice) return undefined;

        const onKey = (e) => {
            if (e.key === 'Escape') {
                setChoice(null);
                focus();
                return;
            }

            // Only when the box is empty, so a scanned code's digits are not picks.
            if (code === '' && /^[1-9]$/.test(e.key)) {
                const match = choice.matches[Number(e.key) - 1];

                if (match) {
                    e.preventDefault();
                    pick(match);
                }
            }
        };

        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [choice, code, pick, focus]);

    if (!enabled) return null;

    const cancelChoice = () => {
        setChoice(null);
        focus();
    };

    const scanBox = (
        <form onSubmit={submit} className="flex gap-2">
            <div className="relative flex-1 min-w-0">
                <ScanLine
                    className={`absolute left-3 top-1/2 -translate-y-1/2 text-regx-orange pointer-events-none ${compact ? 'w-4 h-4' : 'w-5 h-5'}`}
                    aria-hidden="true"
                />
                <input
                    ref={input}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder={compact ? 'Scan winner' : 'Scan or type a registration number'}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    aria-label="Winner's registration number"
                    title="Scan the winner's registration code, or type it and press Enter"
                    className={`w-full border-gray-300 rounded-lg font-mono uppercase outline-none focus:border-regx-orange focus:ring-2 focus:ring-orange-100 ${
                        compact
                            ? 'border pl-9 pr-3 py-2 text-sm tracking-wide'
                            : 'border-2 pl-11 pr-4 py-3 text-lg tracking-wider'
                    }`}
                />
            </div>
            <button
                type="submit"
                disabled={busy || code.trim() === ''}
                aria-label="Record win"
                title="Record win"
                className={`inline-flex items-center justify-center gap-2 rounded-lg bg-regx-orange text-white font-medium hover:opacity-90 disabled:opacity-50 shrink-0 ${
                    compact ? 'w-9' : 'px-5'
                }`}
            >
                {busy ? <Loader2 className={`animate-spin ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} /> : <Trophy className={compact ? 'w-4 h-4' : 'w-5 h-5'} />}
                {!compact && <span className="hidden sm:inline">Record win</span>}
            </button>
        </form>
    );

    // Several matches waiting: the desk chooses.
    const picker = choice && (
        <div
            className={`rounded-xl border-2 border-amber-400 bg-amber-50 ${compact ? 'p-3 shadow-xl' : 'p-4'}`}
            role="alertdialog"
            aria-label="Choose the match"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className={`font-semibold text-amber-900 ${compact ? 'text-sm' : ''}`}>{choice.message}</p>
                        <p className="text-xs text-amber-800 mt-0.5">
                            Click the match, or press its number. Esc cancels — nothing is recorded until you choose.
                        </p>
                    </div>
                </div>
                <button type="button" onClick={cancelChoice} className="p-1 rounded-lg text-amber-700 hover:bg-amber-100" aria-label="Cancel">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className={`grid gap-2 mt-3 ${compact ? '' : 'sm:grid-cols-2'}`}>
                {choice.matches.map((match, index) => (
                    <button
                        key={`${match.category}-${match.matchId}-${match.player.id}`}
                        type="button"
                        onClick={() => pick(match)}
                        disabled={busy}
                        className="text-left flex items-start gap-3 p-2.5 rounded-lg bg-white border border-amber-200 hover:border-regx-orange hover:shadow-sm transition disabled:opacity-50"
                    >
                        <span className="w-7 h-7 rounded-md bg-gray-900 text-white text-sm font-bold flex items-center justify-center shrink-0">
                            {index + 1}
                        </span>
                        <span className="min-w-0">
                            <span className="block text-sm font-semibold text-gray-900 truncate">{match.category}</span>
                            <span className="block text-xs text-gray-500">
                                {match.round}{match.matchNumber ? ` · Match ${match.matchNumber}` : ''}
                            </span>
                            <span className="mt-1 flex items-center gap-1.5 text-xs text-gray-700">
                                <span className="font-medium">{match.player.name}</span>
                                <Swords className="w-3.5 h-3.5 text-gray-400" />
                                <span>{match.opponent.name}</span>
                            </span>
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );

    // The result of the last scan.
    const result = last && !choice && (
        <div
            role="status"
            className={`rounded-xl flex items-start gap-3 border ${compact ? 'p-3 shadow-xl' : 'p-4'} ${
                last.tone === 'ok'
                    ? 'bg-green-50 border-green-300 text-green-900'
                    : last.tone === 'warn'
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-red-50 border-red-300 text-red-900'
            }`}
        >
            {last.tone === 'ok' ? (
                <CheckCircle2 className={`shrink-0 text-green-600 ${compact ? 'w-5 h-5' : 'w-6 h-6'}`} />
            ) : (
                <AlertTriangle className={`shrink-0 ${compact ? 'w-5 h-5' : 'w-6 h-6'}`} />
            )}
            <div className="min-w-0 flex-1">
                <p className={`font-semibold leading-tight ${compact ? 'text-sm' : 'text-lg'}`}>{last.title}</p>
                <p className={`mt-0.5 ${compact ? 'text-xs' : 'text-sm'}`}>{last.detail}</p>
            </div>
            {compact && (
                <button
                    type="button"
                    onClick={() => {
                        setLast(null);
                        focus();
                    }}
                    className="p-0.5 rounded opacity-60 hover:opacity-100"
                    aria-label="Dismiss"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );

    // The last result has its own box above, so the list starts after it.
    const recent = (last && history[0]?.title === last.title && history[0]?.detail === last.detail ? history.slice(1) : history).slice(0, historySize);

    if (compact) {
        return (
            <div className="relative w-full sm:w-72 shrink-0">
                {scanBox}

                {(picker || result) && (
                    <div className="absolute right-0 top-full mt-2 z-30 w-[min(28rem,calc(100vw-2rem))]">
                        {picker || result}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
            <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-orange-50 text-regx-orange flex items-center justify-center shrink-0">
                    <ScanLine className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                    <h2 className="font-semibold text-gray-900">Scan the winner</h2>
                    <p className="text-xs text-gray-500">
                        Scan the winner's registration code, or type a number like REG-5WAM339J and press Enter.
                        Their waiting match is recorded as won.
                    </p>
                </div>
            </div>

            {scanBox}

            {camera && !cameraOn && (
                <button
                    type="button"
                    onClick={() => {
                        input.current?.blur();
                        setCameraOn(true);
                    }}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:border-regx-orange hover:text-regx-orange"
                >
                    <Camera className="w-5 h-5" /> Use camera — scan the ID card with this device
                </button>
            )}

            {camera && cameraOn && (
                <div className="mt-3">
                    <CameraScanner
                        onCode={(text) => send({ code: text })}
                        paused={busy || Boolean(choice)}
                        onClose={() => {
                            setCameraOn(false);
                            cameraOnRef.current = false;
                            focus();
                        }}
                    />
                </div>
            )}

            {picker && <div className="mt-4">{picker}</div>}
            {result && <div className="mt-4">{result}</div>}

            {recent.length > 0 && (
                <div className="mt-4">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                            Recent scans <span className="normal-case font-normal text-gray-400">· on this device, last 24 hours</span>
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                if (window.confirm('Clear the scan history on this device? Recorded results are not affected.')) {
                                    setHistory([]);
                                    setLast(null);
                                }
                            }}
                            className="text-[11px] font-medium text-gray-400 hover:text-red-600"
                        >
                            Clear
                        </button>
                    </div>
                    <ul className="divide-y divide-gray-100 text-sm">
                        {recent.map((item, i) => (
                            <li key={i} className="py-1.5 flex items-center gap-2">
                                <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${
                                        item.tone === 'ok' ? 'bg-green-500' : item.tone === 'warn' ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                />
                                <span className="font-medium text-gray-800 truncate">{item.title}</span>
                                <span className="text-gray-500 truncate hidden sm:inline">{item.detail}</span>
                                <span className="ml-auto text-xs text-gray-400 shrink-0">
                                    {item.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

/* ------------------------------------------------------------------ history */

/**
 * Scan history lives in this browser only (localStorage), one list per form:
 * a desk that reloads or comes back after a break still sees what it scanned.
 * Entries older than a day are dropped, and at most HISTORY_LIMIT are kept.
 * It is a convenience — results themselves are saved on the server, and the
 * fixture History is the record. Storage may be unavailable (private mode,
 * blocked); then the list simply starts empty.
 */
const HISTORY_LIMIT = 200;
const HISTORY_HOURS = 24;

const historyKey = (formId) => `regx:scan-history:${formId}`;

const loadHistory = (formId) => {
    try {
        const raw = JSON.parse(window.localStorage.getItem(historyKey(formId)) ?? '[]');
        const since = Date.now() - HISTORY_HOURS * 3600 * 1000;

        return (Array.isArray(raw) ? raw : [])
            .map((item) => ({ ...item, at: new Date(item.at) }))
            .filter((item) => !Number.isNaN(item.at.getTime()) && item.at.getTime() >= since)
            .slice(0, HISTORY_LIMIT);
    } catch {
        return [];
    }
};

const saveHistory = (formId, items) => {
    try {
        const key = historyKey(formId);

        if (items.length === 0) {
            window.localStorage.removeItem(key);
        } else {
            window.localStorage.setItem(key, JSON.stringify(items.map((item) => ({ ...item, at: item.at.toISOString() }))));
        }
    } catch {
        // Full or blocked storage: the history just is not kept.
    }
};

/* ------------------------------------------------------------------ sound */

let audio = null;

/**
 * Short tones from the Web Audio API — no sound files to load. A scan is a
 * key press, which counts as the user's go-ahead for the browser to play.
 *
 *   ok      one short high blip
 *   choose  three urgent beeps: look at the screen, a choice is needed
 *   error   one low buzz
 */
const beep = (kind) => {
    try {
        audio ??= new (window.AudioContext || window.webkitAudioContext)();
        if (audio.state === 'suspended') audio.resume();

        const pattern = {
            ok: [[1320, 0, 0.09]],
            choose: [[1000, 0, 0.16], [1000, 0.24, 0.16], [1400, 0.48, 0.28]],
            error: [[220, 0, 0.35]],
        }[kind] ?? [];

        pattern.forEach(([freq, start, length]) => {
            const osc = audio.createOscillator();
            const gain = audio.createGain();
            const t = audio.currentTime + start;

            osc.type = kind === 'error' ? 'sawtooth' : 'square';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + length);

            osc.connect(gain).connect(audio.destination);
            osc.start(t);
            osc.stop(t + length + 0.02);
        });
    } catch {
        // No audio (or blocked): the screen still says everything.
    }
};

export default ResultScanner;

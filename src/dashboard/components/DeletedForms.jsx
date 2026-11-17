import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { Trash2, RotateCcw, X, Loader2, ShieldAlert, Mail, ArchiveRestore } from 'lucide-react';
import { fetchTrash, restoreForm, sendPurgeCode, purgeForm } from '../../store/slices/formsSlice';

const formatDate = (value) => {
    if (!value) return '';

    return new Date(value.replace(' ', 'T')).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
    });
};

/**
 * Forms that were deleted, with a way back — and a way to be rid of them.
 *
 * Deleting a form only moves it here, so a mistake costs nothing. Erasing one
 * for good is the one thing in the app that cannot be undone, so it takes a
 * six-digit code emailed to the account owner, not just a click.
 *
 * `eventId` narrows the list to one event's forms; without it, every deleted
 * form on the account shows. `onChanged` runs after a restore or a purge so the
 * page behind can refresh its own list.
 */
const DeletedForms = ({ eventId = null, onClose, onChanged }) => {
    const dispatch = useDispatch();

    const [forms, setForms] = useState(null);
    const [canPurge, setCanPurge] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [erasing, setErasing] = useState(null);

    const load = useCallback(() => {
        dispatch(fetchTrash())
            .unwrap()
            .then(({ forms: all, canPurge: allowed }) => {
                setForms(eventId ? all.filter((f) => String(f.event_id) === String(eventId)) : all);
                setCanPurge(allowed);
            })
            .catch((message) => {
                toast.error(message);
                setForms([]);
            });
    }, [dispatch, eventId]);

    useEffect(load, [load]);

    const restore = async (form) => {
        setBusyId(form.id);

        try {
            const result = await dispatch(restoreForm(form.id)).unwrap();
            toast.success(result.message || 'Form restored.');
            setForms((current) => current.filter((f) => f.id !== form.id));
            onChanged?.();
        } catch (message) {
            toast.error(message);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-8">
                <div className="bg-white rounded-2xl w-full max-w-2xl max-h-full flex flex-col overflow-hidden shadow-2xl">
                    <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-3 shrink-0">
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">Deleted forms</h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Restore a form to use it again, or delete it permanently. A permanent delete
                                removes the form and every registration on it, and cannot be undone.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className="p-1.5 -m-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 shrink-0"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="overflow-y-auto p-5 space-y-3">
                        {forms === null && (
                            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
                                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                            </div>
                        )}

                        {forms !== null && forms.length === 0 && (
                            <div className="text-center py-10">
                                <ArchiveRestore className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-sm font-semibold text-gray-900">Nothing deleted</p>
                                <p className="text-xs text-gray-500 mt-1">Forms you delete will wait here.</p>
                            </div>
                        )}

                        {forms !== null && forms.length > 0 && !canPurge && (
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                You can restore forms here. Only the account owner can delete one permanently.
                            </p>
                        )}

                        {(forms ?? []).map((form) => (
                            <div key={form.id} className="rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-gray-900 truncate">{form.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                                        {[form.event_name, `deleted ${formatDate(form.deleted_at)}`].filter(Boolean).join(' · ')}
                                    </p>
                                    {form.hidden_submissions > 0 && (
                                        <p className="text-[11px] text-gray-500 mt-1">
                                            {form.hidden_submissions} hidden registration{form.hidden_submissions === 1 ? '' : 's'} kept with it
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => restore(form)}
                                        disabled={busyId === form.id}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange transition-colors disabled:opacity-50"
                                    >
                                        {busyId === form.id
                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                            : <RotateCcw className="w-4 h-4" />}
                                        Restore
                                    </button>

                                    {canPurge && (
                                        <button
                                            type="button"
                                            onClick={() => setErasing(form)}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete permanently
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {erasing && (
                <PermanentDelete
                    form={erasing}
                    onClose={() => setErasing(null)}
                    onDone={() => {
                        setForms((current) => current.filter((f) => f.id !== erasing.id));
                        setErasing(null);
                        onChanged?.();
                    }}
                />
            )}
        </>
    );
};

/**
 * The last step: an emailed code, then the delete.
 *
 * Step one asks for the code to be sent — it is not sent just for opening this —
 * and step two takes the six digits. The server decides whether a code is right;
 * nothing here knows it.
 */
const PermanentDelete = ({ form, onClose, onDone }) => {
    const dispatch = useDispatch();

    const [stage, setStage] = useState('ask');
    const [digits, setDigits] = useState(['', '', '', '', '', '']);
    const [sentTo, setSentTo] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const boxes = useRef([]);

    const send = async () => {
        setBusy(true);
        setError('');

        try {
            const result = await dispatch(sendPurgeCode(form.id)).unwrap();
            setSentTo(result.message);
            setStage('code');
            setDigits(['', '', '', '', '', '']);
            setTimeout(() => boxes.current[0]?.focus(), 50);
        } catch (message) {
            setError(message);
        } finally {
            setBusy(false);
        }
    };

    const type = (index, value) => {
        // A paste drops all six at once.
        if (value.length > 1) {
            const pasted = value.replace(/\D/g, '').slice(0, 6).split('');
            const next = ['', '', '', '', '', ''];
            pasted.forEach((char, i) => { next[i] = char; });
            setDigits(next);
            boxes.current[Math.min(pasted.length, 5)]?.focus();
            return;
        }

        if (value !== '' && !/^\d$/.test(value)) return;

        const next = [...digits];
        next[index] = value;
        setDigits(next);

        if (value !== '' && index < 5) boxes.current[index + 1]?.focus();
    };

    const backspace = (index, e) => {
        if (e.key === 'Backspace' && digits[index] === '' && index > 0) boxes.current[index - 1]?.focus();
    };

    const erase = async () => {
        const code = digits.join('');

        if (code.length < 6) {
            setError('Enter all six digits of the code.');
            return;
        }

        setBusy(true);
        setError('');

        try {
            const result = await dispatch(purgeForm({ formId: form.id, code })).unwrap();
            toast.success(result.message || 'Form deleted permanently.');
            onDone();
        } catch (message) {
            setError(message);
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                <div className="p-6">
                    <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                        <ShieldAlert className="w-6 h-6" />
                    </div>

                    <h3 className="font-bold text-gray-900 text-xl text-center">Delete permanently?</h3>
                    <p className="text-sm text-gray-600 text-center mt-2">
                        <span className="font-semibold text-gray-900">“{form.name}”</span> and{' '}
                        {form.hidden_submissions > 0
                            ? `its ${form.hidden_submissions} registration${form.hidden_submissions === 1 ? '' : 's'}`
                            : 'everything on it'}{' '}
                        will be erased for good.
                    </p>

                    {stage === 'ask' && (
                        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-4 text-center font-medium">
                            This cannot be undone. We will email you a code to confirm it is you.
                        </p>
                    )}

                    {stage === 'code' && (
                        <div className="mt-5">
                            <p className="text-xs text-gray-600 text-center flex items-center justify-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 shrink-0" /> {sentTo}
                            </p>

                            <div className="flex justify-center gap-2 mt-4">
                                {digits.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={(el) => { boxes.current[index] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        maxLength={6}
                                        value={digit}
                                        onChange={(e) => type(index, e.target.value)}
                                        onKeyDown={(e) => backspace(index, e)}
                                        aria-label={`Digit ${index + 1}`}
                                        className="w-10 h-12 text-center text-lg font-bold border border-gray-300 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none bg-gray-50"
                                    />
                                ))}
                            </div>

                            <div className="text-center mt-3">
                                <button
                                    type="button"
                                    onClick={send}
                                    disabled={busy}
                                    className="text-xs font-medium text-regx-orange hover:underline disabled:opacity-50"
                                >
                                    Send a new code
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-4">
                            {error}
                        </p>
                    )}
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
                    >
                        Cancel
                    </button>

                    {stage === 'ask' ? (
                        <button
                            type="button"
                            onClick={send}
                            disabled={busy}
                            className="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                            {busy ? 'Sending…' : 'Email me a code'}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={erase}
                            disabled={busy || digits.join('').length < 6}
                            className="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                            {busy ? 'Deleting…' : 'Delete forever'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeletedForms;

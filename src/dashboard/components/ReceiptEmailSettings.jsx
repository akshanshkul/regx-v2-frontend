import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Mail, Loader2, Save, Send, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const DEFAULTS = {
    enabled: true,
    subject: '',
    heading: '',
    message: '',
    footer: '',
    brand: '',
    accent: '#F26522',
    showAnswers: true,
};

const control =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none';

/**
 * The email a participant gets after registering: whether it is sent, what it
 * says, its colour. Every box left empty keeps the standard wording.
 *
 * The preview is drawn by the server from the real template, using the
 * latest registration on the form, so what is shown is what is sent.
 */
const ReceiptEmailSettings = ({ form, formId, onSave }) => {
    const saved = useMemo(() => ({ ...DEFAULTS, ...(form?.settings?.receiptEmail ?? {}) }), [form?.settings?.receiptEmail]);
    const [draft, setDraft] = useState(saved);
    const [preview, setPreview] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const frame = useRef(null);

    useEffect(() => setDraft(saved), [saved]);

    const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
    const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

    // Redraw the preview a moment after typing stops.
    useEffect(() => {
        const timer = setTimeout(() => {
            setLoadingPreview(true);
            api.post(`/forms/${formId}/receipt-preview`, { receiptEmail: draft })
                .then((res) => setPreview(res.data))
                .catch(() => setPreview(null))
                .finally(() => setLoadingPreview(false));
        }, 400);

        return () => clearTimeout(timer);
    }, [draft, formId]);

    useEffect(() => {
        if (frame.current && preview?.html) frame.current.srcdoc = preview.html;
    }, [preview?.html]);

    const save = async () => {
        setSaving(true);
        try {
            await onSave(draft);
        } finally {
            setSaving(false);
        }
    };

    const sendTest = async () => {
        setTesting(true);
        try {
            const res = await api.post(`/forms/${formId}/receipt-test`, { receiptEmail: draft });
            toast.success(res.message || 'Test email sent.');
        } catch (error) {
            const data = error?.response?.data;
            toast.error(data?.messages?.email || data?.messages?.error || data?.message || 'Could not send the test email.');
        } finally {
            setTesting(false);
        }
    };

    const insert = (key, token) => set({ [key]: `${draft[key] ?? ''}${token}` });

    return (
        <div className="grid lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] gap-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-5 self-start">
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900">Registration email</h3>
                        <p className="text-xs text-gray-500">
                            Sent to the participant once their registration is complete — after payment when there is a fee.
                            Only sent when the form asks for an email.
                        </p>
                    </div>
                </div>

                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${draft.enabled ? 'border-regx-orange bg-orange-50/40' : 'border-gray-200'}`}>
                    <input
                        type="checkbox"
                        checked={draft.enabled}
                        onChange={(e) => set({ enabled: e.target.checked })}
                        className="mt-0.5 w-4 h-4 accent-regx-orange"
                    />
                    <span className="text-sm">
                        <span className="font-medium text-gray-900">Send this email</span>
                        <span className="block text-xs text-gray-500">Turn off to send participants no email from this form.</span>
                    </span>
                </label>

                <fieldset disabled={!draft.enabled} className="space-y-4 disabled:opacity-50">
                    <Field label="Subject" hint="Empty: “Registration received — {form} ({reference})”.">
                        <input className={control} value={draft.subject} maxLength={200} onChange={(e) => set({ subject: e.target.value })} placeholder="e.g. You're in, {name}! — {event}" />
                        <Tokens onPick={(t) => insert('subject', t)} />
                    </Field>

                    <Field label="Heading" hint="Empty: “Registration received / confirmed”.">
                        <input className={control} value={draft.heading} maxLength={120} onChange={(e) => set({ heading: e.target.value })} placeholder="e.g. See you at the event!" />
                    </Field>

                    <Field label="Message" hint="Shown at the top of the email.">
                        <textarea className={`${control} min-h-[110px]`} value={draft.message} maxLength={2000} onChange={(e) => set({ message: e.target.value })} placeholder={'Hi {name},\nThanks for registering. Reporting time is 8 AM.'} />
                        <Tokens onPick={(t) => insert('message', t)} />
                    </Field>

                    <Field label="Footer note" hint="Shown under the card — a website, a WhatsApp group, a reminder.">
                        <textarea className={`${control} min-h-[70px]`} value={draft.footer} maxLength={600} onChange={(e) => set({ footer: e.target.value })} />
                    </Field>

                    <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                        <Field label="Name at the top" hint="Empty shows RegX.">
                            <input className={control} value={draft.brand} maxLength={60} onChange={(e) => set({ brand: e.target.value })} placeholder="e.g. Pro Panja League" />
                        </Field>
                        <Field label="Colour">
                            <input type="color" value={draft.accent} onChange={(e) => set({ accent: e.target.value.toUpperCase() })} className="w-12 h-10 rounded-lg border border-gray-300 p-0.5 bg-white cursor-pointer" aria-label="Accent colour" />
                        </Field>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={draft.showAnswers} onChange={(e) => set({ showAnswers: e.target.checked })} className="w-4 h-4 accent-regx-orange" />
                        Include their answers in the email
                    </label>
                </fieldset>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                        type="button"
                        onClick={save}
                        disabled={!dirty || saving}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save email
                    </button>
                    <button
                        type="button"
                        onClick={sendTest}
                        disabled={testing}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        title="Send this version to your own email address"
                    >
                        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send me a test
                    </button>
                    <button
                        type="button"
                        onClick={() => setDraft({ ...DEFAULTS, enabled: draft.enabled })}
                        className="inline-flex items-center gap-1.5 px-2 py-2 text-xs text-gray-500 hover:text-gray-800"
                    >
                        <RotateCcw className="w-3.5 h-3.5" /> Standard wording
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden self-start">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Preview</p>
                        <p className="text-sm font-medium text-gray-900 truncate">{preview?.subject ?? '…'}</p>
                    </div>
                    {loadingPreview && <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />}
                </div>
                {preview?.sample && (
                    <p className="px-4 py-2 text-[11px] text-amber-700 bg-amber-50 border-b border-amber-100">
                        No registrations yet — showing a sample. The real email lists the participant’s own answers.
                    </p>
                )}
                {!draft.enabled && (
                    <p className="px-4 py-2 text-[11px] text-gray-600 bg-gray-50 border-b border-gray-100">
                        Turned off — participants will not get this email.
                    </p>
                )}
                <iframe ref={frame} title="Email preview" sandbox="" className="w-full h-[720px] bg-gray-50" />
            </div>
        </div>
    );
};

const Field = ({ label, hint, children }) => (
    <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        {children}
        {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
);

/** Click to add a placeholder that is filled in per participant. */
const Tokens = ({ onPick }) => (
    <div className="flex flex-wrap gap-1 mt-1.5">
        {['{name}', '{reference}', '{event}', '{form}'].map((t) => (
            <button
                key={t}
                type="button"
                onClick={() => onPick(t)}
                className="px-1.5 py-0.5 rounded bg-gray-100 text-[11px] font-mono text-gray-600 hover:bg-orange-100 hover:text-regx-orange"
            >
                {t}
            </button>
        ))}
    </div>
);

export default ReceiptEmailSettings;

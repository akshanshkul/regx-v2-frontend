import React, { useRef, useState } from 'react';
import {
    FileText, CalendarDays, MapPin, Loader2, Info, Image as ImageIcon, Upload, X, Gavel,
} from 'lucide-react';

const control =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none';

/**
 * What the form says about itself at the top of the page.
 *
 * The name, the blurb underneath it, and the date and place shown beside them.
 * The last three are the reason this screen exists: they used to come from the
 * event and only from the event, which is right until one event runs more than
 * one form — an audition in one town and the final in another, a heat a month
 * before the main day. Those forms need to say where and when *they* happen
 * without somebody inventing a second event to hang them off.
 *
 * So each is an override: fill it in and the form uses it, leave it blank and
 * the event's own value shows through, exactly as it always has. The event's
 * value is the placeholder, so it is clear what blank means.
 */
const FormDetails = ({ form, event, onChange, onUploadImage, onRemoveImage }) => {
    const display = form?.settings?.display ?? {};
    const review = form?.settings?.review ?? {};

    const [draft, setDraft] = useState({
        name: form?.name ?? '',
        description: form?.description ?? '',
        eventName: display.eventName ?? '',
        date: display.date ?? '',
        venue: display.venue ?? '',
        state: display.state ?? '',
        hideEventName: display.hideEventName === true,
        hideDate: display.hideDate === true,
        hideBanner: display.hideBanner === true,
        hideLogos: display.hideLogos === true,

        referencePattern: form?.settings?.referencePattern ?? '',

        reviewEnabled: review.enabled === true,
        reviewNotify: review.notify !== false,
        approvedLabel: review.approvedLabel ?? '',
        rejectedLabel: review.rejectedLabel ?? '',
        pendingLabel: review.pendingLabel ?? '',
    });

    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    const set = (patch) => {
        setDraft((current) => ({ ...current, ...patch }));
        setDirty(true);
    };

    const save = async () => {
        if (draft.name.trim().length < 2) return;

        setSaving(true);

        try {
            // Only what was filled in is stored, so clearing a box goes back to
            // the event's value rather than saving an empty override.
            const next = {};

            ['eventName', 'date', 'venue', 'state'].forEach((key) => {
                if (draft[key].trim() !== '') next[key] = draft[key].trim();
            });

            // Stored only when switched on, so unticking restores the inherited
            // event value rather than leaving an ignored false flag behind.
            if (draft.hideEventName) next.hideEventName = true;
            if (draft.hideDate) next.hideDate = true;
            if (draft.hideBanner) next.hideBanner = true;
            if (draft.hideLogos) next.hideLogos = true;

            // Only wording that was actually typed is stored, so clearing a
            // box goes back to the default rather than saving an empty label.
            const reviewSettings = { enabled: draft.reviewEnabled, notify: draft.reviewNotify };

            [
                ['approvedLabel', draft.approvedLabel],
                ['rejectedLabel', draft.rejectedLabel],
                ['pendingLabel', draft.pendingLabel],
            ].forEach(([key, value]) => {
                if (value.trim() !== '') reviewSettings[key] = value.trim();
            });

            await onChange({
                name: draft.name.trim(),
                description: draft.description,
                // Read at save time, not at mount, so this does not overwrite
                // something the Sharing tab saved a moment ago.
                settings: {
                    ...(form?.settings ?? {}),
                    display: next,
                    review: reviewSettings,
                    // Blank goes back to the default REG-XXXXXXXX.
                    referencePattern: draft.referencePattern.trim(),
                },
            });

            setDirty(false);
        } finally {
            setSaving(false);
        }
    };

    // What the pattern would produce, worked out here so it can be seen as typed.
    const examplePattern = (pattern) => {
        const now = new Date();
        const rand = (n) => Array.from({ length: n }, (_, i) => 'K7M2LAX5Q9WZ'[(i * 5 + 3) % 12]).join('');

        return (pattern.trim() || 'REG-{RAND:8}')
            .replace(/\{RAND(?::(\d+))?\}/g, (_, n) => rand(Number(n) || 8))
            .replace(/\{SEQ(?::(\d+))?\}/g, (_, n) => '1'.padStart(Number(n) || 4, '0'))
            .replace(/\{YYYY\}/g, String(now.getFullYear()))
            .replace(/\{YY\}/g, String(now.getFullYear()).slice(2))
            .replace(/\{MM\}/g, String(now.getMonth() + 1).padStart(2, '0'))
            .replace(/\{DD\}/g, String(now.getDate()).padStart(2, '0'))
            .toUpperCase();
    };

    const overridden = ['eventName', 'date', 'venue', 'state'].filter((key) => draft[key].trim() !== '');

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-regx-orange" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900">What the form says at the top</h3>
                        <p className="text-xs text-gray-500">
                            The heading a participant reads before they fill anything in.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={save}
                        disabled={saving || !dirty || draft.name.trim().length < 2}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-regx-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-40 shrink-0"
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Form name <span className="text-red-500">*</span>
                        </label>
                        <input
                            className={control}
                            value={draft.name}
                            onChange={(e) => set({ name: e.target.value })}
                        />
                        {draft.name.trim().length < 2 && (
                            <p className="text-[11px] text-red-600 mt-1">Give the form a name.</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            rows={8}
                            className={`${control} leading-relaxed`}
                            placeholder={'Register for …\n\nImportant\n• …'}
                            value={draft.description}
                            onChange={(e) => set({ description: e.target.value })}
                        />
                        <p className="text-[11px] text-gray-500 mt-1">
                            Line breaks are kept, so a list of notes stays a list. The first line is
                            also what a shared link and a search result show, unless the Sharing tab
                            overrides it.
                        </p>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                        <Field label="Event heading shown on this form">
                            <input
                                className={control}
                                maxLength={150}
                                placeholder={event?.name || 'e.g. Regional Qualifier'}
                                value={draft.eventName}
                                disabled={draft.hideEventName}
                                onChange={(e) => set({ eventName: e.target.value })}
                            />
                            <Fallback value={event?.name} />
                        </Field>
                        <label className="flex items-start gap-2 mt-3 text-sm text-gray-700 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={draft.hideEventName}
                                onChange={(e) => set({ hideEventName: e.target.checked })}
                                className="mt-0.5 w-4 h-4 rounded accent-regx-orange"
                            />
                            <span>
                                Hide the event heading on this form
                                <span className="block text-[11px] text-gray-500">
                                    This affects only the heading above this form; the event and its other forms are unchanged.
                                </span>
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                        <CalendarDays className="w-4 h-4 text-gray-400" />
                    </div>

                    <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900">Date and place for this form</h3>
                        <p className="text-xs text-gray-500">
                            Shown under the description. Leave blank to use the event's own.
                        </p>
                    </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                            type="date"
                            className={control}
                            value={draft.date}
                            disabled={draft.hideDate}
                            onChange={(e) => set({ date: e.target.value })}
                        />
                        {!draft.hideDate && <Fallback value={event?.date} format={formatDate} />}
                        <label className="flex items-start gap-2 mt-3 text-sm text-gray-700 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={draft.hideDate}
                                onChange={(e) => set({ hideDate: e.target.checked })}
                                className="mt-0.5 w-4 h-4 rounded accent-regx-orange"
                            />
                            <span>
                                Hide the event date on this form
                                <span className="block text-[11px] text-gray-500">
                                    The date is also removed from this form’s search structured data.
                                </span>
                            </span>
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                        <input
                            className={control}
                            placeholder={event?.venue || 'e.g. Riverside Hall'}
                            value={draft.venue}
                            onChange={(e) => set({ venue: e.target.value })}
                        />
                        <Fallback value={event?.venue} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                        <input
                            className={control}
                            placeholder={event?.state || 'e.g. Uttar Pradesh'}
                            value={draft.state}
                            onChange={(e) => set({ state: e.target.value })}
                        />
                        <Fallback value={event?.state} />
                    </div>
                </div>

                <p className="text-[11px] text-gray-500 flex items-start gap-1.5 mt-4">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-px text-gray-400" />
                    <span>
                        {overridden.length === 0 ? (
                            <>
                                This form shows <strong className="font-medium">{event?.name ?? 'the event'}</strong>
                                's own date and place. Changing the event changes it here too.
                            </>
                        ) : (
                            <>
                                This form shows its own {overridden.join(', ')} — changing the event will
                                not change {overridden.length === 1 ? 'it' : 'them'}. The date and place
                                also go into the shared-link preview and the search listing.
                            </>
                        )}
                    </span>
                </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                        <ImageIcon className="w-4 h-4 text-gray-400" />
                    </div>

                    <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900">Banner and logos for this form</h3>
                        <p className="text-xs text-gray-500">
                            {event
                                ? "Leave the banner or first logo alone and the event's own picture is used."
                                : 'This form has no event, so these are the only pictures it shows.'}
                        </p>
                    </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 mb-5">
                    {[
                        ['hideBanner', 'Hide the banner', 'No banner on this form — not its own, not the event’s.'],
                        ['hideLogos', 'Hide the logos', 'No logos on this form — not its own, not the event’s.'],
                    ].map(([key, title, hint]) => (
                        <label
                            key={key}
                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                                draft[key] ? 'border-regx-orange bg-orange-50/40' : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={draft[key]}
                                onChange={(e) => set({ [key]: e.target.checked })}
                                className="mt-0.5 w-4 h-4 rounded accent-regx-orange"
                            />
                            <span className="min-w-0">
                                <span className="block text-sm font-medium text-gray-900">{title}</span>
                                <span className="block text-[11px] text-gray-500 mt-0.5">{hint}</span>
                            </span>
                        </label>
                    ))}
                </div>

                {(draft.hideBanner || draft.hideLogos) && (
                    <p className="text-[11px] text-gray-500 -mt-2 mb-4">
                        Press Save above to apply. Your uploaded pictures are kept, so you can show them again
                        any time.
                    </p>
                )}

                <div className={draft.hideBanner ? 'opacity-40' : ''}>
                <ImageSlot
                    label="Banner"
                    hint="Across the top of the form, and the picture a shared link unfurls with."
                    aspect="aspect-[3/1]"
                    own={form?.images?.banner}
                    inherited={event?.bannerUrl}
                    standalone={!event}
                    onUpload={(file) => onUploadImage('banner', file)}
                    onRemove={() => onRemoveImage('banner')}
                />
                </div>

                <div className={`mt-5 ${draft.hideLogos ? 'opacity-40' : ''}`}>
                    <p className="text-sm font-medium text-gray-700">Logos</p>
                    <p className="text-[11px] text-gray-500 mb-3">
                        Up to three, shown in a row at the top of the form: yours, a co-organiser, a sponsor.
                        PNGs with a transparent background look best.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {[
                            ['logo', 'Logo 1'],
                            ['logo2', 'Logo 2'],
                            ['logo3', 'Logo 3'],
                        ].map(([which, label]) => (
                            <ImageSlot
                                key={which}
                                label={label}
                                aspect="aspect-square"
                                fit="contain"
                                own={form?.images?.[which]}
                                // Only the first slot stands in for the event's logo.
                                inherited={which === 'logo' ? event?.logoUrl : null}
                                standalone={!event || which !== 'logo'}
                                onUpload={(file) => onUploadImage(which, file)}
                                onRemove={() => onRemoveImage(which)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="mb-3">
                    <h3 className="font-semibold text-gray-900">Registration number</h3>
                    <p className="text-xs text-gray-500">
                        How each registration is numbered. Leave blank for the default, REG-XXXXXXXX.
                    </p>
                </div>

                <input
                    value={draft.referencePattern}
                    onChange={(e) => set({ referencePattern: e.target.value })}
                    placeholder="REG-{RAND:8}"
                    maxLength={40}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none"
                />

                <p className="mt-2 text-xs text-gray-500">
                    Looks like: <span className="font-mono font-semibold text-gray-900">{examplePattern(draft.referencePattern)}</span>
                </p>
                <p className="mt-1 text-[11px] text-gray-400">
                    <code>{'{SEQ:4}'}</code> running number, <code>{'{RAND:6}'}</code> random letters and numbers,{' '}
                    <code>{'{YYYY}'}</code> <code>{'{YY}'}</code> <code>{'{MM}'}</code> <code>{'{DD}'}</code> the date. Needs{' '}
                    <code>{'{SEQ}'}</code> or <code>{'{RAND}'}</code>, at most 24 characters, letters, numbers, - and _ only.
                    Example: <code>{'KAS-{YY}-{SEQ:4}'}</code>. Save with the button at the top.
                </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                        <Gavel className="w-4 h-4 text-gray-400" />
                    </div>

                    <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900">Approving what comes in</h3>
                        <p className="text-xs text-gray-500">
                            For a form whose submissions need a decision rather than just collecting.
                        </p>
                    </div>
                </div>

                <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        draft.reviewEnabled ? 'border-regx-orange bg-orange-50/40' : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                    <input
                        type="checkbox"
                        checked={draft.reviewEnabled}
                        onChange={(e) => set({ reviewEnabled: e.target.checked })}
                        className="mt-0.5 w-4 h-4 rounded accent-regx-orange"
                    />
                    <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-900">
                            Each submission needs approving
                        </span>
                        <span className="block text-xs text-gray-500 mt-0.5">
                            Adds a queue to the Submissions tab. Everything already submitted joins it,
                            so nothing that arrived before today is missed.
                        </span>
                    </span>
                </label>

                {draft.reviewEnabled && (
                    <div className="mt-4 space-y-4">
                        <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:border-gray-300 transition-colors">
                            <input
                                type="checkbox"
                                checked={draft.reviewNotify}
                                onChange={(e) => set({ reviewNotify: e.target.checked })}
                                className="mt-0.5 w-4 h-4 rounded accent-regx-orange"
                            />
                            <span className="min-w-0">
                                <span className="block text-sm font-medium text-gray-900">
                                    Email them the decision
                                </span>
                                <span className="block text-xs text-gray-500 mt-0.5">
                                    Sent when you approve or reject, with your note if you leave one.
                                    Nothing is sent while a submission is still waiting.
                                </span>
                            </span>
                        </label>

                        <div className="grid sm:grid-cols-3 gap-4">
                            <Field label="Waiting is called">
                                <input
                                    className={control}
                                    placeholder="Under review"
                                    value={draft.pendingLabel}
                                    onChange={(e) => set({ pendingLabel: e.target.value })}
                                />
                            </Field>
                            <Field label="Yes is called">
                                <input
                                    className={control}
                                    placeholder="Approved"
                                    value={draft.approvedLabel}
                                    onChange={(e) => set({ approvedLabel: e.target.value })}
                                />
                            </Field>
                            <Field label="No is called">
                                <input
                                    className={control}
                                    placeholder="Not accepted"
                                    value={draft.rejectedLabel}
                                    onChange={(e) => set({ rejectedLabel: e.target.value })}
                                />
                            </Field>
                        </div>

                        <p className="text-[11px] text-gray-500 flex items-start gap-1.5">
                            <Info className="w-3.5 h-3.5 shrink-0 mt-px text-gray-400" />
                            <span>
                                Your wording is what the applicant sees — on the page where they check
                                their reference, and in the email. “Shortlisted” reads better than
                                “Approved” on a job application.
                            </span>
                        </p>
                    </div>
                )}

                {!draft.reviewEnabled && review.enabled === true && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-3 inline-flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
                        <span>
                            Saving this clears every decision already made on this form. The
                            submissions themselves are untouched.
                        </span>
                    </p>
                )}
            </div>

            <Preview
                name={draft.name}
                eventName={draft.hideEventName ? null : draft.eventName.trim() || event?.name}
                description={draft.description}
                date={draft.hideDate ? null : draft.date || event?.date}
                venue={draft.venue || event?.venue}
                state={draft.state || event?.state}
                banner={draft.hideBanner ? null : form?.images?.banner || event?.bannerUrl}
                logos={
                    draft.hideLogos
                        ? []
                        : [form?.images?.logo || event?.logoUrl, form?.images?.logo2, form?.images?.logo3].filter(Boolean)
                }
            />
        </div>
    );
};

/**
 * One picture, with where it is currently coming from.
 *
 * Saying "the event's" rather than just showing the image matters: without it
 * an organiser cannot tell whether this form has a banner of its own or is
 * borrowing one, and so cannot tell what changing the event would do to it.
 */
const ImageSlot = ({ label, hint, aspect, fit = 'cover', own, inherited, standalone = false, onUpload, onRemove }) => {
    const input = useRef(null);
    const [busy, setBusy] = useState(false);

    const shown = own || inherited;

    const choose = async (file) => {
        if (!file) return;

        setBusy(true);

        try {
            await onUpload(file);
        } finally {
            setBusy(false);
            // Cleared so picking the same file again still fires a change.
            if (input.current) input.current.value = '';
        }
    };

    const drop = async () => {
        setBusy(true);

        try {
            await onRemove();
        } finally {
            setBusy(false);
        }
    };

    return (
        <div>
            <div className="flex items-baseline justify-between gap-2 mb-1">
                <p className="text-sm font-medium text-gray-700">{label}</p>
                <span className={`text-[11px] ${own ? 'text-regx-orange' : 'text-gray-400'}`}>
                    {own ? 'this form’s own' : inherited ? 'the event’s' : 'none set'}
                </span>
            </div>

            <div
                className={`${aspect} w-full rounded-xl border overflow-hidden flex items-center justify-center relative ${
                    own ? 'border-regx-orange/40 bg-orange-50/30' : 'border-dashed border-gray-300 bg-gray-50'
                }`}
            >
                {shown ? (
                    <img
                        src={shown}
                        alt=""
                        className={`w-full h-full ${fit === 'contain' ? 'object-contain p-2' : 'object-cover'}`}
                    />
                ) : (
                    <span className="text-xs text-gray-400 px-3 text-center">Nothing to show</span>
                )}

                {busy && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 mt-2">
                <input
                    ref={input}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => choose(e.target.files?.[0])}
                />

                <button
                    type="button"
                    onClick={() => input.current?.click()}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange transition-colors disabled:opacity-40"
                >
                    <Upload className="w-3.5 h-3.5" />
                    {own ? 'Replace' : 'Upload'}
                </button>

                {own && (
                    <button
                        type="button"
                        onClick={drop}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-40"
                    >
                        <X className="w-3.5 h-3.5" />
                        {standalone ? 'Remove' : 'Use the event’s'}
                    </button>
                )}
            </div>

            {hint && <p className="text-[11px] text-gray-500 mt-1.5">{hint}</p>}
        </div>
    );
};

/** A labelled control, for the short ones that need no hint. */
const Field = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {children}
    </div>
);

/** What shows when the box above is left empty. */
const Fallback = ({ value, format }) => {
    if (!value) return null;

    return (
        <p className="text-[11px] text-gray-400 mt-1 truncate">
            Blank uses {format ? format(value) : value}
        </p>
    );
};

const formatDate = (value) => {
    if (!value) return '';

    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** The top of the public form, as these settings would render it. */
const Preview = ({ name, eventName, description, date, venue, state, banner, logos = [] }) => (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-4">
            How the top of the form reads
        </p>

        {banner && (
            <img src={banner} alt="" className="block w-full max-h-40 object-cover rounded-xl mb-4" />
        )}

        <div className="border-l-2 border-regx-orange pl-4">
            {logos.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    {logos.map((src) => (
                        <img
                            key={src}
                            src={src}
                            alt=""
                            className="w-12 h-12 rounded-xl object-contain p-1 border border-gray-200 bg-white"
                        />
                    ))}
                </div>
            )}

            <h1 className="text-2xl font-medium tracking-tight text-gray-900">{name || 'Untitled form'}</h1>
            <div className="mt-2 h-1 w-12 rounded-full bg-regx-orange" />

            {eventName && <p className="mt-2 text-base font-medium text-regx-orange">{eventName}</p>}

            <div className="my-4 border-t border-gray-100" />

            {description && (
                <p className="text-sm leading-6 text-gray-600 whitespace-pre-line">{description}</p>
            )}

            {(date || venue) && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-sm text-gray-500">
                    {date && (
                        <span className="inline-flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-gray-400" />
                            {formatDate(date)}
                        </span>
                    )}
                    {venue && (
                        <span className="inline-flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {[venue, state].filter(Boolean).join(', ')}
                        </span>
                    )}
                </div>
            )}
        </div>
    </div>
);

export default FormDetails;

import React, { useState } from 'react';
import { Globe, Search, Share2, Loader2, Info, EyeOff } from 'lucide-react';

const control =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none';

/** Google truncates around here; over it, the rest is cut rather than rejected. */
const TITLE_LIMIT = 70;
const DESCRIPTION_LIMIT = 160;

/**
 * How this form looks when it is shared, and when it is found.
 *
 * A registration link travels by being pasted into a WhatsApp group far more
 * often than by being searched for, so the preview below is the point of this
 * screen: it shows the organiser the thing their participants will actually
 * see, and lets them fix it before it is sent to two hundred people.
 *
 * Every box is optional. Left empty, the server works the wording out from the
 * form and its event — which is usually right, and is what a form nobody has
 * touched already gets today. What is typed here wins over that.
 */
const SeoSettings = ({ form, event, onChange }) => {
    const saved = form?.settings?.seo ?? {};

    const [draft, setDraft] = useState({
        title: saved.title ?? '',
        description: saved.description ?? '',
        image: saved.image ?? '',
        keywords: (saved.keywords ?? []).join(', '),
        indexable: saved.indexable !== false,
    });

    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    const set = (patch) => {
        setDraft((current) => ({ ...current, ...patch }));
        setDirty(true);
    };

    const save = async () => {
        setSaving(true);

        try {
            // Only what was filled in is stored, so clearing a box goes back to
            // the worked-out default rather than saving an empty override.
            const seo = {
                indexable: draft.indexable,
            };

            if (draft.title.trim() !== '') seo.title = draft.title.trim();
            if (draft.description.trim() !== '') seo.description = draft.description.trim();
            if (draft.image.trim() !== '') seo.image = draft.image.trim();

            const keywords = draft.keywords
                .split(',')
                .map((word) => word.trim())
                .filter(Boolean);

            if (keywords.length > 0) seo.keywords = keywords;

            await onChange({ settings: { ...(form?.settings ?? {}), seo } });
            setDirty(false);
        } finally {
            setSaving(false);
        }
    };

    // What the server would work out on its own, shown as placeholder text so
    // the organiser can see the default instead of guessing at it.
    const fallbackTitle = event?.name && !form?.name?.includes(event.name)
        ? `${form?.name ?? 'Registration'} — ${event.name}`
        : (form?.name ?? 'Registration');

    const fallbackDescription =
        (form?.description ?? '').split('\n')[0] ||
        `Register for ${event?.name ?? 'this event'}.`;

    const title = draft.title.trim() || fallbackTitle;
    const description = draft.description.trim() || fallbackDescription;
    const image = draft.image.trim() || event?.bannerUrl || event?.logoUrl || '';
    const url = `${window.location.origin}/form/${form?.slug ?? ''}`;

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                        <Globe className="w-4 h-4 text-regx-orange" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900">How this form is shared and found</h3>
                        <p className="text-xs text-gray-500">
                            Leave anything blank and it is worked out from the form and the event.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={save}
                        disabled={saving || !dirty}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-regx-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-40 shrink-0"
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>

                <div className="space-y-4">
                    <Field
                        label="Title"
                        hint="Shown as the headline in search results and on a shared link."
                        count={draft.title.length}
                        limit={TITLE_LIMIT}
                    >
                        <input
                            className={control}
                            placeholder={fallbackTitle}
                            value={draft.title}
                            onChange={(e) => set({ title: e.target.value })}
                        />
                    </Field>

                    <Field
                        label="Description"
                        hint="The two lines underneath. Say what the event is, where and when."
                        count={draft.description.length}
                        limit={DESCRIPTION_LIMIT}
                    >
                        <textarea
                            rows={3}
                            className={control}
                            placeholder={fallbackDescription}
                            value={draft.description}
                            onChange={(e) => set({ description: e.target.value })}
                        />
                    </Field>

                    <Field
                        label="Share image"
                        hint="The picture on a shared link. Left blank, the event's banner is used."
                    >
                        <input
                            className={control}
                            placeholder={image || 'https://…'}
                            value={draft.image}
                            onChange={(e) => set({ image: e.target.value })}
                        />
                    </Field>

                    <Field label="Keywords" hint="Comma separated. Optional — search engines have ignored these for years.">
                        <input
                            className={control}
                            placeholder="dance competition, kasganj, auditions"
                            value={draft.keywords}
                            onChange={(e) => set({ keywords: e.target.value })}
                        />
                    </Field>

                    <label
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                            draft.indexable ? 'border-gray-200 hover:border-gray-300' : 'border-amber-300 bg-amber-50'
                        }`}
                    >
                        <input
                            type="checkbox"
                            checked={!draft.indexable}
                            onChange={(e) => set({ indexable: !e.target.checked })}
                            className="mt-0.5 w-4 h-4 rounded accent-regx-orange"
                        />
                        <span className="min-w-0">
                            <span className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                                <EyeOff className="w-3.5 h-3.5" />
                                Keep this form out of search engines
                            </span>
                            <span className="block text-xs text-gray-500 mt-0.5">
                                The link still works and still previews when shared — it just is not
                                indexed or listed in the sitemap. For an invite-only registration.
                            </span>
                        </span>
                    </label>

                    <p className="text-[11px] text-gray-500 flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 shrink-0 mt-px text-gray-400" />
                        <span>
                            An unpublished form, or one under an unpublished event, is never indexed
                            whatever is set here.
                        </span>
                    </p>
                </div>
            </div>

            <Preview title={title} description={description} image={image} url={url} />
        </div>
    );
};

const Field = ({ label, hint, count, limit, children }) => (
    <div>
        <div className="flex items-baseline justify-between gap-2 mb-1">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            {limit !== undefined && count > 0 && (
                <span className={`text-[11px] ${count > limit ? 'text-amber-600' : 'text-gray-400'}`}>
                    {count}/{limit}
                    {count > limit && ' — will be cut'}
                </span>
            )}
        </div>
        {children}
        {hint && <p className="text-[11px] text-gray-500 mt-1">{hint}</p>}
    </div>
);

/**
 * The two places the link is actually seen.
 *
 * Approximations, not renderings — every platform lays these out slightly
 * differently and changes it without warning. Close enough to catch a title
 * that runs on too long or a missing image, which is what this is for.
 */
const Preview = ({ title, description, image, url }) => (
    <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5 mb-3">
                <Search className="w-3.5 h-3.5" />
                In a search result
            </p>

            <p className="text-xs text-gray-600 truncate">{url}</p>
            <p className="text-[#1a0dab] text-lg leading-snug mt-0.5 line-clamp-2">
                {clip(title, TITLE_LIMIT)}
            </p>
            <p className="text-sm text-gray-600 mt-1 line-clamp-3">
                {clip(description, DESCRIPTION_LIMIT)}
            </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5 mb-3">
                <Share2 className="w-3.5 h-3.5" />
                Shared in a chat
            </p>

            <div className="rounded-xl border border-gray-200 overflow-hidden max-w-sm">
                {image ? (
                    <img
                        src={image}
                        alt=""
                        className="block w-full h-32 object-cover bg-gray-100"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                ) : (
                    <div className="h-32 bg-gray-100 flex items-center justify-center text-xs text-gray-400 text-center px-4">
                        No image — the link will unfurl as plain text
                    </div>
                )}

                <div className="p-3">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide truncate">
                        {hostOf(url)}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 mt-0.5">
                        {title}
                    </p>
                    <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{description}</p>
                </div>
            </div>
        </div>
    </div>
);

const clip = (text, limit) => (text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`);

const hostOf = (url) => {
    try {
        return new URL(url).host;
    } catch {
        return url;
    }
};

export default SeoSettings;

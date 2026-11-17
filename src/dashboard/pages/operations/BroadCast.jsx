import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    Megaphone, Plus, X, Send, Users, Mail, FileText, Search, ImagePlus, Loader2,
    CheckCircle2, CircleDashed, AlertTriangle, ChevronDown, CalendarDays, ListChecks, Inbox, Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

import {
    fetchEvents,
    selectEventsStatus,
    makeSelectFilteredEvents,
} from "../../../store/slices/eventsSlice";

import {
    fetchBroadcasts,
    fetchEventBroadcastRecipients,
    fetchFormBroadcastRecipients,
    createBroadcast,
    sendBroadcast,
    deleteBroadcast,
    clearBroadcastRecipients,
} from "../../../store/slices/broadcastSlice";

import {
    fetchFormsList,
    selectAllForms,
    selectFormsStatus,
} from "../../../store/slices/formsSlice";

const field =
    "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none disabled:bg-gray-50 disabled:text-gray-400";

const MAX_CUSTOM = 100;

const STATUS = {
    sent: { label: "Sent", chip: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 },
    sending: { label: "Sending", chip: "bg-blue-50 text-blue-700 border-blue-200", icon: Loader2 },
    partial: { label: "Partly sent", chip: "bg-amber-50 text-amber-700 border-amber-200", icon: AlertTriangle },
    failed: { label: "Failed", chip: "bg-red-50 text-red-700 border-red-200", icon: AlertTriangle },
    draft: { label: "Draft", chip: "bg-gray-100 text-gray-600 border-gray-200", icon: CircleDashed },
};

const statusOf = (value) => STATUS[value] ?? STATUS.draft;

const formatWhen = (value) => {
    if (!value) return "—";

    const date = new Date(String(value).replace(" ", "T"));

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString("en-GB", {
        day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
    });
};

/**
 * Broadcasts: email everyone registered on an event or a form, or a list typed
 * in. The page is the history of what was sent, with a composer one click away.
 */
export default function Broadcast() {
    const dispatch = useDispatch();

    // One selector for the life of the component; building it in the render body
    // gave the store a new one every time and re-ran it needlessly.
    const selectFilteredEvents = useMemo(() => makeSelectFilteredEvents(), []);
    const events = useSelector(selectFilteredEvents);
    const eventStatus = useSelector(selectEventsStatus);

    const forms = useSelector(selectAllForms);
    const formsStatus = useSelector(selectFormsStatus);

    const broadcastState = useSelector((state) => state.broadcast);

    const broadcasts = Array.isArray(broadcastState?.items) ? broadcastState.items : [];
    const recipients = Array.isArray(broadcastState?.recipients) ? broadcastState.recipients : [];

    const loading = broadcastState?.loading ?? false;
    const recipientsLoading = broadcastState?.recipientsLoading ?? false;
    const creating = broadcastState?.creating ?? false;

    const [showCreate, setShowCreate] = useState(false);
    const [eventId, setEventId] = useState("");
    const [formId, setFormId] = useState("");
    const [audienceType, setAudienceType] = useState("event");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [customEmails, setCustomEmails] = useState("");
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState("");

    useEffect(() => {
        dispatch(fetchEvents());
        dispatch(fetchFormsList()).catch(() => {});
        dispatch(fetchBroadcasts());
    }, [dispatch]);

    // A preview URL holds the file in memory until it is released.
    useEffect(() => () => {
        if (imagePreview) URL.revokeObjectURL(imagePreview);
    }, [imagePreview]);

    const handleEventChange = (value) => {
        setEventId(value);
        setFormId("");
        dispatch(clearBroadcastRecipients());

        if (!value) return;

        if (audienceType === "event") dispatch(fetchEventBroadcastRecipients(value));
    };

    const handleAudienceChange = (type) => {
        setAudienceType(type);
        setFormId("");
        dispatch(clearBroadcastRecipients());

        if (type === "event" && eventId) dispatch(fetchEventBroadcastRecipients(eventId));
    };

    const handleFormChange = (value) => {
        setFormId(value);
        dispatch(clearBroadcastRecipients());

        if (value) dispatch(fetchFormBroadcastRecipients(value));
    };

    const handleImageChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        setImage(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const removeImage = () => {
        setImage(null);
        setImagePreview("");
    };

    const customList = useMemo(
        () => [
            ...new Set(
                customEmails
                    .split(/[\n,;]+/)
                    .map((email) => email.trim().toLowerCase())
                    .filter(Boolean)
            ),
        ],
        [customEmails]
    );

    // Everything the send will go to, as the server will receive it.
    const audienceEmails = audienceType === "custom"
        ? customList
        : recipients.map((recipient) => recipient.email).filter(Boolean);

    const resetForm = () => {
        setShowCreate(false);
        setEventId("");
        setFormId("");
        setAudienceType("event");
        setSubject("");
        setMessage("");
        setCustomEmails("");
        setImage(null);
        setImagePreview("");
        dispatch(clearBroadcastRecipients());
    };

    const handleSubmit = async () => {
        if (audienceType !== "form" && !eventId) return toast.error("Please select an event");
        if (audienceType === "form" && !formId) return toast.error("Please select a registration form");
        if (!subject.trim()) return toast.error("Please enter a subject");
        if (!message.trim()) return toast.error("Please enter a message");

        if (audienceType === "custom" && audienceEmails.length > MAX_CUSTOM) {
            return toast.error(`Maximum ${MAX_CUSTOM} emails allowed`);
        }

        if (!audienceEmails.length) return toast.error("No recipients found");

        const formData = new FormData();

        formData.append("audience_type", audienceType);
        formData.append("subject", subject.trim());
        formData.append("message", message.trim());

        if (audienceType === "form") {
            formData.append("form_id", formId);
            const selectedForm = forms.find((form) => String(form.id) === String(formId));
            if (selectedForm?.event_id) formData.append("event_id", selectedForm.event_id);
        } else {
            formData.append("event_id", eventId);
        }

        formData.append("recipients", JSON.stringify(audienceEmails));

        if (image) formData.append("image", image);

        const toastId = toast.loading("Creating broadcast...");

        try {
            // FormData is not serialisable; the store's serializableCheck ignores
            // the broadcast/create action for that reason.
            const createResult = await dispatch(createBroadcast(formData));

            if (!createBroadcast.fulfilled.match(createResult)) {
                toast.error(
                    createResult.payload || createResult.error?.message || "Failed to create broadcast",
                    { id: toastId }
                );
                return;
            }

            const publicId = createResult.payload?.public_id;

            if (!publicId) {
                toast.error("Broadcast created but public ID was not returned.", { id: toastId });
                dispatch(fetchBroadcasts());
                return;
            }

            toast.loading("Sending broadcast...", { id: toastId });

            const sendResult = await dispatch(sendBroadcast(publicId));

            if (sendBroadcast.fulfilled.match(sendResult)) {
                toast.success(
                    `Broadcast sent to ${audienceEmails.length} recipient${audienceEmails.length > 1 ? "s" : ""}.`,
                    { id: toastId }
                );
                resetForm();
                dispatch(fetchBroadcasts());
                return;
            }

            toast.error(
                sendResult.payload || sendResult.error?.message || "Broadcast was created but failed to send.",
                { id: toastId }
            );

            // It exists as a draft now, so show it.
            dispatch(fetchBroadcasts());
        } catch (error) {
            toast.error(error?.message || "Something went wrong while sending the broadcast.", { id: toastId });
            dispatch(fetchBroadcasts());
        }
    };

    const selectedEvent = events.find((event) => String(event.id) === String(eventId));
    const visibleForms = eventId
        ? forms.filter((form) => String(form.event_id) === String(eventId))
        : forms;

    return (
        <div className="max-w-[1400px] mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-orange-50 text-regx-orange flex items-center justify-center shrink-0">
                        <Megaphone className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-gray-900 font-display">Broadcast</h1>
                        <p className="text-sm text-gray-500">Email everyone registered on an event or a form.</p>
                    </div>
                </div>

                {!showCreate && (
                    <button
                        type="button"
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-regx-orange text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        New broadcast
                    </button>
                )}
            </div>

            {showCreate ? (
                <Composer
                    events={events}
                    eventStatus={eventStatus}
                    visibleForms={visibleForms}
                    formsStatus={formsStatus}
                    eventId={eventId}
                    formId={formId}
                    audienceType={audienceType}
                    subject={subject}
                    message={message}
                    customEmails={customEmails}
                    customCount={customList.length}
                    imagePreview={imagePreview}
                    recipients={recipients}
                    recipientsLoading={recipientsLoading}
                    audienceCount={audienceEmails.length}
                    creating={creating}
                    eventName={selectedEvent?.name}
                    onEvent={handleEventChange}
                    onAudience={handleAudienceChange}
                    onForm={handleFormChange}
                    onSubject={setSubject}
                    onMessage={setMessage}
                    onCustomEmails={setCustomEmails}
                    onImage={handleImageChange}
                    onRemoveImage={removeImage}
                    onCancel={() => setShowCreate(false)}
                    onSubmit={handleSubmit}
                />
            ) : (
                <BroadcastHistory broadcasts={broadcasts} loading={loading} onCreate={() => setShowCreate(true)} />
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ composer */

function Composer({
    events, eventStatus, visibleForms, formsStatus,
    eventId, formId, audienceType, subject, message, customEmails, customCount,
    imagePreview, recipients, recipientsLoading, audienceCount, creating, eventName,
    onEvent, onAudience, onForm, onSubject, onMessage, onCustomEmails, onImage, onRemoveImage, onCancel, onSubmit,
}) {
    const [showList, setShowList] = useState(false);

    const audiences = [
        { key: "event", icon: Users, title: "All registrations", text: "Everyone registered for the event" },
        { key: "form", icon: FileText, title: "One form", text: "Only people from a chosen form" },
        { key: "custom", icon: Mail, title: "Custom list", text: `Up to ${MAX_CUSTOM} email addresses` },
    ];

    const overLimit = audienceType === "custom" && customCount > MAX_CUSTOM;
    const canSend = !creating && !recipientsLoading && audienceCount > 0 && !overLimit;

    return (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
            <div className="xl:col-span-3 space-y-5">
                {/* 1 — audience */}
                <Panel number="1" title="Who is it for?" hint="Choose an event, or select one form directly—including a standalone form.">
                    <div className="space-y-4">
                        <div>
                            <Label>{audienceType === "form" ? "Filter forms by event (optional)" : "Event"}</Label>
                            <select
                                value={eventId}
                                onChange={(e) => onEvent(e.target.value)}
                                disabled={eventStatus === "loading" || (audienceType === "form" && formsStatus === "loading")}
                                className={field}
                            >
                                <option value="">
                                    {eventStatus === "loading"
                                        ? "Loading events…"
                                        : audienceType === "form"
                                            ? "All forms, including standalone"
                                            : "Select an event"}
                                </option>
                                {events.map((event) => (
                                    <option key={event.id} value={event.id}>{event.name}</option>
                                ))}
                            </select>
                            {audienceType === "form" && (
                                <p className="mt-1 text-xs text-gray-500">
                                    Leave empty to choose any form. Selecting an event filters this list to that event.
                                </p>
                            )}
                        </div>

                        <div>
                            <Label>Audience</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {audiences.map(({ key, icon: Icon, title, text }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => onAudience(key)}
                                        aria-pressed={audienceType === key}
                                        className={`text-left rounded-xl border p-3.5 transition-colors ${
                                            audienceType === key
                                                ? "border-regx-orange bg-orange-50/50 ring-1 ring-regx-orange/30"
                                                : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    >
                                        <Icon className={`w-4 h-4 mb-2 ${audienceType === key ? "text-regx-orange" : "text-gray-400"}`} />
                                        <p className="text-sm font-semibold text-gray-900">{title}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{text}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {audienceType === "form" && (
                            <div>
                                <Label>Registration form</Label>
                                <select
                                    value={formId}
                                    onChange={(e) => onForm(e.target.value)}
                                    disabled={formsStatus === "loading"}
                                    className={field}
                                >
                                    <option value="">
                                        {formsStatus === "loading"
                                            ? "Loading forms…"
                                            : visibleForms.length === 0
                                                ? "No forms available"
                                                : "Select a form"}
                                    </option>
                                    {visibleForms.map((form) => (
                                        <option key={form.id} value={form.id}>
                                            {form.event_name ? `${form.event_name} · ` : ""}
                                            {form.name || form.title}{!form.event_id ? " · Standalone" : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {audienceType === "custom" && (
                            <div>
                                <Label>Email addresses</Label>
                                <textarea
                                    value={customEmails}
                                    onChange={(e) => onCustomEmails(e.target.value)}
                                    rows={5}
                                    placeholder={"user@example.com\nanother@example.com"}
                                    className={field}
                                />
                                <p className={`text-xs mt-1 ${overLimit ? "text-red-600 font-medium" : "text-gray-500"}`}>
                                    {customCount} / {MAX_CUSTOM} — separate with a new line, comma or semicolon. Duplicates are removed.
                                </p>
                            </div>
                        )}

                        {audienceType !== "custom" && (
                            <div className="rounded-xl border border-gray-200 bg-gray-50/60">
                                <button
                                    type="button"
                                    onClick={() => setShowList((open) => !open)}
                                    disabled={recipientsLoading || recipients.length === 0}
                                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left disabled:cursor-default"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                                            {recipientsLoading
                                                ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                                : <ListChecks className="w-4 h-4 text-gray-500" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {recipientsLoading ? "Finding recipients…" : `${recipients.length} recipient${recipients.length === 1 ? "" : "s"}`}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {recipientsLoading
                                                    ? "One moment"
                                                    : recipients.length === 0
                                                        ? (audienceType === "event" && eventId) || (audienceType === "form" && formId)
                                                            ? "No registered recipients found."
                                                            : audienceType === "form"
                                                                ? "Choose a form to see who will receive it."
                                                                : "Choose an event to see who will receive it."
                                                        : "Tap to see who they are"}
                                            </p>
                                        </div>
                                    </div>

                                    {!recipientsLoading && recipients.length > 0 && (
                                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showList ? "rotate-180" : ""}`} />
                                    )}
                                </button>

                                {showList && recipients.length > 0 && (
                                    <ul className="max-h-56 overflow-auto border-t border-gray-200 divide-y divide-gray-100 bg-white rounded-b-xl">
                                        {recipients.map((recipient, index) => (
                                            <li key={recipient.email || `r-${index}`} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                                                <span className="font-medium text-gray-800 truncate">{recipient.name || "—"}</span>
                                                <span className="text-gray-500 truncate">{recipient.email}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </Panel>

                {/* 2 — message */}
                <Panel number="2" title="What do you want to say?" hint="Links can be pasted straight into the message.">
                    <div className="space-y-4">
                        <div>
                            <Label>Subject</Label>
                            <input
                                value={subject}
                                onChange={(e) => onSubject(e.target.value)}
                                placeholder="e.g. Schedule update for Saturday"
                                maxLength={150}
                                className={field}
                            />
                        </div>

                        <div>
                            <Label>Message</Label>
                            <textarea
                                value={message}
                                onChange={(e) => onMessage(e.target.value)}
                                rows={8}
                                placeholder="Write your message…"
                                className={field}
                            />
                        </div>

                        <div>
                            <Label>Image <span className="font-normal text-gray-400">(optional)</span></Label>

                            {imagePreview ? (
                                <div className="relative inline-block">
                                    <img src={imagePreview} alt="Selected" className="max-h-44 rounded-xl border border-gray-200" />
                                    <button
                                        type="button"
                                        onClick={onRemoveImage}
                                        aria-label="Remove image"
                                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center gap-1.5 border border-dashed border-gray-300 rounded-xl py-6 text-sm text-gray-500 cursor-pointer hover:border-regx-orange hover:text-regx-orange transition-colors">
                                    <ImagePlus className="w-5 h-5" />
                                    Add a banner or poster
                                    <input type="file" accept="image/*" onChange={onImage} className="hidden" />
                                </label>
                            )}
                        </div>
                    </div>
                </Panel>
            </div>

            {/* Preview and send */}
            <div className="xl:col-span-2 space-y-5 xl:sticky xl:top-4">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                        <Inbox className="w-4 h-4 text-gray-400" />
                        <p className="text-sm font-semibold text-gray-900">Preview</p>
                    </div>

                    <div className="p-5 bg-gray-50/60">
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <p className="text-[11px] text-gray-400">Subject</p>
                                <p className={`text-sm font-semibold ${subject ? "text-gray-900" : "text-gray-300"}`}>
                                    {subject || "Your subject appears here"}
                                </p>
                            </div>

                            <div className="p-4">
                                {imagePreview && <img src={imagePreview} alt="" className="w-full rounded-lg mb-3 border border-gray-100" />}

                                <p className={`text-sm whitespace-pre-line break-words leading-relaxed ${message ? "text-gray-700" : "text-gray-300"}`}>
                                    {message || "Your message appears here as you type."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500">Will be sent to</p>
                            <p className="text-3xl font-bold text-gray-900 leading-tight">
                                {recipientsLoading ? "…" : audienceCount}
                                <span className="text-sm font-medium text-gray-500 ml-1.5">
                                    {audienceCount === 1 ? "person" : "people"}
                                </span>
                            </p>
                        </div>

                        {eventName && (
                            <span className="text-xs font-medium text-gray-600 bg-gray-100 rounded-full px-3 py-1 max-w-[50%] truncate">
                                {eventName}
                            </span>
                        )}
                    </div>

                    <div className="flex gap-3 mt-5">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={creating}
                            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={!canSend}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-regx-orange text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {creating ? "Sending…" : audienceCount > 0 ? `Send to ${audienceCount}` : "Send"}
                        </button>
                    </div>

                    <p className="text-[11px] text-gray-400 mt-3">Emails are sent straight away and cannot be recalled.</p>
                </div>
            </div>
        </div>
    );
}

function Panel({ number, title, hint, children }) {
    return (
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <header className="flex items-start gap-3 px-5 py-4 border-b border-gray-100">
                <span className="w-7 h-7 rounded-full bg-regx-orange text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {number}
                </span>
                <div>
                    <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                    <p className="text-xs text-gray-500">{hint}</p>
                </div>
            </header>

            <div className="p-5">{children}</div>
        </section>
    );
}

function Label({ children }) {
    return <label className="block text-sm font-medium text-gray-700 mb-1.5">{children}</label>;
}

/* ------------------------------------------------------------------- history */

function BroadcastHistory({ broadcasts = [], loading = false, onCreate }) {
    const dispatch = useDispatch();

    const [sendingId, setSendingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("all");

    const totals = useMemo(() => {
        const sent = broadcasts.filter((b) => b.status === "sent" || b.status === "partial");

        return {
            all: broadcasts.length,
            sent: broadcasts.filter((b) => b.status === "sent").length,
            drafts: broadcasts.filter((b) => !b.status || b.status === "draft").length,
            reached: sent.reduce((sum, b) => sum + (Number(b.recipient_count) || 0), 0),
        };
    }, [broadcasts]);

    const shown = useMemo(() => {
        const needle = query.trim().toLowerCase();

        return broadcasts.filter((b) => {
            const current = b.status || "draft";

            if (status !== "all" && current !== status) return false;

            return !needle || `${b.subject ?? ""} ${b.message ?? ""}`.toLowerCase().includes(needle);
        });
    }, [broadcasts, query, status]);

    const handleSend = async (broadcast) => {
        if (!broadcast?.public_id) return toast.error("Broadcast ID not found");

        const toastId = toast.loading("Sending broadcast...");

        setSendingId(broadcast.public_id);

        try {
            const result = await dispatch(sendBroadcast(broadcast.public_id));

            if (sendBroadcast.fulfilled.match(result)) {
                toast.success("Broadcast sent.", { id: toastId });
            } else {
                toast.error(result.payload || result.error?.message || "Failed to send broadcast.", { id: toastId });
            }
        } catch (error) {
            toast.error(error?.message || "Failed to send broadcast.", { id: toastId });
        } finally {
            setSendingId(null);
            dispatch(fetchBroadcasts());
        }
    };

    const handleDelete = async (broadcast) => {
        if (!broadcast?.public_id) return toast.error("Broadcast ID not found");

        const sent = broadcast.status === "sent" || broadcast.status === "partial";

        const warning = sent
            ? `Delete "${broadcast.subject}"? The emails already went out and cannot be recalled; only this record is removed.`
            : `Delete "${broadcast.subject}"? This cannot be undone.`;

        if (!window.confirm(warning)) return;

        setDeletingId(broadcast.public_id);

        try {
            await dispatch(deleteBroadcast(broadcast.public_id)).unwrap();
            toast.success("Broadcast deleted.");
        } catch (message) {
            toast.error(typeof message === "string" ? message : "Failed to delete broadcast.");
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading broadcasts">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
                </div>
                <div className="rounded-2xl bg-gray-100 animate-pulse h-72" />
            </div>
        );
    }

    if (broadcasts.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-14 text-center">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 text-regx-orange flex items-center justify-center mx-auto mb-4">
                    <Megaphone className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">No broadcasts yet</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                    Tell your participants about a schedule change, a venue, or the results — in one email.
                </p>
                <button
                    type="button"
                    onClick={onCreate}
                    className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-regx-orange text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Create your first broadcast
                </button>
            </div>
        );
    }

    const stats = [
        { label: "Broadcasts", value: totals.all, icon: Megaphone, tone: "bg-orange-50 text-regx-orange" },
        { label: "Sent", value: totals.sent, icon: CheckCircle2, tone: "bg-green-50 text-green-600" },
        { label: "Drafts", value: totals.drafts, icon: CircleDashed, tone: "bg-gray-100 text-gray-500" },
        { label: "People reached", value: totals.reached.toLocaleString("en-IN"), icon: Users, tone: "bg-blue-50 text-blue-600" },
    ];

    const filters = [["all", "All"], ["draft", "Drafts"], ["sent", "Sent"], ["failed", "Failed"]];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map(({ label, value, icon: Icon, tone }) => (
                    <div key={label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
                            <p className="text-xs text-gray-500 mt-1">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="relative w-full md:max-w-sm">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search subject or message…"
                            aria-label="Search broadcasts"
                            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-regx-orange/20 focus:border-regx-orange"
                        />
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Filter by status">
                        {filters.map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={status === key}
                                onClick={() => setStatus(key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                    status === key ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {shown.length === 0 ? (
                    <p className="py-14 text-center text-sm text-gray-500">No broadcast matches.</p>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {shown.map((broadcast) => {
                            const current = statusOf(broadcast.status);
                            const StatusIcon = current.icon;
                            const isDraft = !broadcast.status || broadcast.status === "draft";
                            const isSending = sendingId === broadcast.public_id;
                            const count = broadcast.recipient_count ?? 0;

                            return (
                                <li
                                    key={broadcast.public_id || broadcast.id}
                                    className="px-5 py-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-5 hover:bg-gray-50/60 transition-colors"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold text-gray-900 truncate">{broadcast.subject || "—"}</p>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${current.chip}`}>
                                                <StatusIcon className={`w-3 h-3 ${broadcast.status === "sending" ? "animate-spin" : ""}`} />
                                                {current.label}
                                            </span>
                                        </div>

                                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{broadcast.message || "—"}</p>

                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                                            <span className="inline-flex items-center gap-1 capitalize">
                                                <Users className="w-3.5 h-3.5" />
                                                {broadcast.audience_type || "—"} · {count} recipient{count === 1 ? "" : "s"}
                                            </span>
                                            <span className="inline-flex items-center gap-1">
                                                <CalendarDays className="w-3.5 h-3.5" />
                                                {formatWhen(broadcast.created_at)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {isDraft && (
                                            <button
                                                type="button"
                                                onClick={() => handleSend(broadcast)}
                                                disabled={isSending || deletingId === broadcast.public_id}
                                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-regx-orange text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
                                            >
                                                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                {isSending ? "Sending…" : "Send"}
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => handleDelete(broadcast)}
                                            disabled={isSending || deletingId === broadcast.public_id || broadcast.status === "sending"}
                                            aria-label={`Delete ${broadcast.subject || "broadcast"}`}
                                            title="Delete"
                                            className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors disabled:opacity-40"
                                        >
                                            {deletingId === broadcast.public_id
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : <Trash2 className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}

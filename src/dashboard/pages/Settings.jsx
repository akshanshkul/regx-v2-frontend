import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Bell,
    Globe,
    CalendarCog,
    ShieldCheck,
    Save,
    ChevronRight,
    KeyRound,
    CreditCard,
    UserRound,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchSettings,
    saveSettings,
    setSetting,
    selectSettings,
    selectSettingsOptions,
    selectSettingsStatus,
    selectSettingsSaving,
    selectSettingsDirty,
} from '../../store/slices/settingsSlice';
import {
    fetchEventTypes,
    selectEventTypes,
} from '../../store/slices/eventTypesSlice';
import SettingsSkeleton from '../components/SettingsSkeleton';

const NOTIFICATIONS = [
    {
        key: 'notify_registrations',
        label: 'New registrations',
        hint: 'Email me when someone registers for one of my events.',
    },
    {
        key: 'notify_payments',
        label: 'Payments received',
        hint: 'Email me when a registration payment succeeds.',
    },
    {
        key: 'notify_event_reminders',
        label: 'Event reminders',
        hint: 'Remind me shortly before an event of mine goes live.',
    },
    {
        key: 'notify_weekly_summary',
        label: 'Weekly summary',
        hint: 'A Monday digest of registrations and revenue across my events.',
    },
    {
        key: 'notify_login_alerts',
        label: 'Login alerts',
        hint: 'Email me when my account is signed into from a new device.',
    },
    {
        key: 'notify_product_updates',
        label: 'Product updates',
        hint: 'Occasional news about new RegX features. No marketing spam.',
    },
];

const Toggle = ({ checked, onChange, id }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        id={id}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-regx-orange/30 ${
            checked ? 'bg-regx-orange' : 'bg-gray-200'
        }`}
    >
        <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                checked ? 'translate-x-6' : 'translate-x-1'
            }`}
        />
    </button>
);

const Card = ({ icon: Icon, title, description, children }) => (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100 flex items-start gap-3">
            <Icon className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
            <div>
                <h2 className="font-bold text-gray-900">{title}</h2>
                {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
            </div>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

const Field = ({ label, hint, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {children}
        {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
);

const selectClass =
    'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none';

const Settings = () => {
    const dispatch = useDispatch();

    const settings = useSelector(selectSettings);
    const options = useSelector(selectSettingsOptions);
    const status = useSelector(selectSettingsStatus);
    const isSaving = useSelector(selectSettingsSaving);
    const isDirty = useSelector(selectSettingsDirty);
    const eventTypes = useSelector(selectEventTypes);

    const isLoading = status === 'idle' || status === 'loading';

    useEffect(() => {
        dispatch(fetchSettings())
            .unwrap()
            .catch((message) => toast.error(message || 'Failed to load settings.'));

        // Shared lookup data; no-ops when another page already loaded it.
        dispatch(fetchEventTypes());
    }, [dispatch]);

    const update = (key, value) => dispatch(setSetting({ key, value }));

    const handleSave = async () => {
        try {
            await dispatch(saveSettings(settings)).unwrap();
            toast.success('Settings saved.');
        } catch (message) {
            toast.error(message || 'Failed to save settings.');
        }
    };

    return (
        <div className=" mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-display">Settings</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Control notifications, regional formats and defaults for your account.
                    </p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving || isLoading || !isDirty}
                    className="flex items-center gap-2 px-5 py-2.5 bg-regx-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:hover:bg-regx-orange shrink-0"
                >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving…' : 'Save changes'}
                </button>
            </div>

            {isLoading || !settings ? (
                <SettingsSkeleton />
            ) : (
                <>
                    {/* Notifications */}
                    <Card
                        icon={Bell}
                        title="Email notifications"
                        description="Choose what RegX emails you about."
                    >
                        <div className="space-y-5">
                            {NOTIFICATIONS.map(({ key, label, hint }) => (
                                <div key={key} className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <label htmlFor={key} className="text-sm font-medium text-gray-900 cursor-pointer">
                                            {label}
                                        </label>
                                        <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
                                    </div>
                                    <Toggle
                                        id={key}
                                        checked={Boolean(settings[key])}
                                        onChange={(value) => update(key, value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Regional */}
                    <Card
                        icon={Globe}
                        title="Regional"
                        description="How dates, times and amounts are shown to you."
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Field label="Timezone" hint="Used for event dates and reminder timing.">
                                <select
                                    value={settings.timezone}
                                    onChange={(e) => update('timezone', e.target.value)}
                                    className={selectClass}
                                >
                                    {(options?.timezones ?? [settings.timezone]).map((tz) => (
                                        <option key={tz} value={tz}>
                                            {tz}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field label="Date format">
                                <select
                                    value={settings.date_format}
                                    onChange={(e) => update('date_format', e.target.value)}
                                    className={selectClass}
                                >
                                    {(options?.date_formats ?? []).map((format) => (
                                        <option key={format} value={format}>
                                            {format}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field label="Time format">
                                <select
                                    value={settings.time_format}
                                    onChange={(e) => update('time_format', e.target.value)}
                                    className={selectClass}
                                >
                                    {(options?.time_formats ?? []).map((format) => (
                                        <option key={format} value={format}>
                                            {format === '12' ? '12-hour (3:30 PM)' : '24-hour (15:30)'}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field label="Currency">
                                <select
                                    value={settings.currency}
                                    onChange={(e) => update('currency', e.target.value)}
                                    className={selectClass}
                                >
                                    {(options?.currencies ?? []).map((currency) => (
                                        <option key={currency} value={currency}>
                                            {currency}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                    </Card>

                    {/* Event defaults */}
                    <Card
                        icon={CalendarCog}
                        title="Event defaults"
                        description="What a new event starts with, so you type less each time."
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Field label="Default status" hint="Applied when you create a new event.">
                                <select
                                    value={settings.default_event_status}
                                    onChange={(e) => update('default_event_status', e.target.value)}
                                    className={selectClass}
                                >
                                    {(options?.statuses ?? []).map((status) => (
                                        <option key={status} value={status}>
                                            {status}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field label="Default event type">
                                <select
                                    value={settings.default_event_type ?? ''}
                                    onChange={(e) => update('default_event_type', e.target.value)}
                                    className={selectClass}
                                >
                                    <option value="">No default</option>
                                    {eventTypes.map((type) => (
                                        <option key={type.id} value={type.name}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                    </Card>

                    {/* Privacy & security */}
                    <Card
                        icon={ShieldCheck}
                        title="Privacy & security"
                        description="Who can see you, and how you sign in."
                    >
                        <div className="space-y-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <label htmlFor="public_profile" className="text-sm font-medium text-gray-900 cursor-pointer">
                                        Public organiser profile
                                    </label>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Show your organiser name on the public pages of your events.
                                    </p>
                                </div>
                                <Toggle
                                    id="public_profile"
                                    checked={Boolean(settings.public_profile)}
                                    onChange={(value) => update('public_profile', value)}
                                />
                            </div>

                            <div className="pt-2 border-t border-gray-100 divide-y divide-gray-100">
                                <Link
                                    to="/dashboard/profile"
                                    className="flex items-center justify-between gap-3 py-3 group"
                                >
                                    <span className="flex items-center gap-3 min-w-0">
                                        <KeyRound className="w-4 h-4 text-gray-400 shrink-0" />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-medium text-gray-900">Change password</span>
                                            <span className="block text-xs text-gray-500">Managed on your profile page.</span>
                                        </span>
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-regx-orange transition-colors shrink-0" />
                                </Link>

                                <Link
                                    to="/dashboard/profile"
                                    className="flex items-center justify-between gap-3 py-3 group"
                                >
                                    <span className="flex items-center gap-3 min-w-0">
                                        <UserRound className="w-4 h-4 text-gray-400 shrink-0" />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-medium text-gray-900">Personal information</span>
                                            <span className="block text-xs text-gray-500">Name, email and contact details.</span>
                                        </span>
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-regx-orange transition-colors shrink-0" />
                                </Link>

                                <Link
                                    to="/dashboard/subscription"
                                    className="flex items-center justify-between gap-3 py-3 group"
                                >
                                    <span className="flex items-center gap-3 min-w-0">
                                        <CreditCard className="w-4 h-4 text-gray-400 shrink-0" />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-medium text-gray-900">Plan & billing</span>
                                            <span className="block text-xs text-gray-500">Your subscription and payment history.</span>
                                        </span>
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-regx-orange transition-colors shrink-0" />
                                </Link>
                            </div>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
};

export default Settings;

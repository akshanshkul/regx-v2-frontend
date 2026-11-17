import React, { useEffect, useState } from 'react';
import {
    IndianRupee,
    Trophy,
    Clock,
    CheckCircle2,
    TrendingUp,
    Plus,
    Upload,
    IdCard,
    FileBarChart,
    Bell,
    Download,
    RefreshCw
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';
import DashboardChart from '../components/DashboardChart';
import {
    fetchDashboardStats,
    fetchRegistrationTrend,
    fetchRevenueOverview,
    fetchCategoryBreakdown,
    fetchDashboardActivity,
    selectWidget,
    selectDashboardLoading,
    selectDashboardFetchedAt,
} from '../../store/slices/dashboardSlice';
import { parseServerDate } from '../../shared/utils/dates';

/** Indian grouping, and no decimals — these are headline figures. */
const money = (value) => `₹ ${Number(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const TREND_PERIODS = [
    { value: '30d', label: 'Last 30 days' },
    { value: '3m', label: 'Last 3 months' },
];

const REVENUE_PERIODS = [
    { value: 'month', label: 'This month' },
    { value: '6m', label: 'Last 6 months' },
    { value: '12m', label: 'Last 12 months' },
];

/** "2 hours ago", from a MySQL timestamp. */
const ago = (value) => {
    const then = parseServerDate(value);
    const minutes = Math.max(0, Math.round((Date.now() - then.getTime()) / 60000));

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} hours ago`;

    return then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const StatCard = ({ title, value, icon, trend, bgColor, iconColor, textColor }) => (
    <div className={`p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between ${bgColor}`}>
        <div className="flex flex-col">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">{title}</p>
            <div className="flex items-end gap-2">
                <h3 className="text-xl font-bold text-gray-900 leading-none">{value}</h3>
                <div className={`text-[10px] font-medium flex items-center whitespace-nowrap ${textColor}`}>
                    <TrendingUp className="w-3 h-3 mr-0.5 shrink-0" />
                    <span>{trend}</span>
                </div>
            </div>
        </div>
        <div className={`p-2 rounded-lg ${iconColor}`}>
            {icon}
        </div>
    </div>
);

const Dashboard = () => {
    const { user } = useAuth();

    const dispatch = useDispatch();

    // Which slice of each widget is being looked at. The data itself lives in
    // the store, kept for five minutes, so coming back to this page costs
    // nothing and flipping a slicer back shows what was already loaded.
    const [formId, setFormId] = useState('all');
    const [period, setPeriod] = useState('30d');
    const [revenuePeriod, setRevenuePeriod] = useState('6m');
    const [sportId, setSportId] = useState('all');

    const stats = useSelector(selectWidget('stats'))?.data ?? null;
    const trend = useSelector(selectWidget('trend', { formId, period }))?.data ?? null;
    const revenue = useSelector(selectWidget('revenue', { period: revenuePeriod }))?.data ?? null;
    const categories = useSelector(selectWidget('categories', { typeId: sportId }))?.data ?? null;
    const activity = useSelector(selectWidget('activity'))?.data ?? null;

    const loading = useSelector(selectDashboardLoading);
    const fetchedAt = useSelector(selectDashboardFetchedAt);

    /** Recount everything now, past both the store's copy and the server's. */
    const refresh = () => {
        dispatch(fetchDashboardStats({ force: true }));
        dispatch(fetchDashboardActivity({ force: true }));
        dispatch(fetchRegistrationTrend({ formId, period, force: true }));
        dispatch(fetchRevenueOverview({ period: revenuePeriod, force: true }));
        dispatch(fetchCategoryBreakdown({ typeId: sportId, force: true }));
    };

    // Each of these is a no-op when the store's copy is still fresh, so the
    // request only goes out on a hard refresh or after five minutes.
    useEffect(() => {
        dispatch(fetchDashboardStats());
        dispatch(fetchDashboardActivity());
    }, [dispatch]);

    useEffect(() => {
        dispatch(fetchRegistrationTrend({ formId, period }));
    }, [dispatch, formId, period]);

    useEffect(() => {
        dispatch(fetchRevenueOverview({ period: revenuePeriod }));
    }, [dispatch, revenuePeriod]);

    useEffect(() => {
        dispatch(fetchCategoryBreakdown({ typeId: sportId }));
    }, [dispatch, sportId]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-1xl font-bold text-gray-900 font-display">Welcome back, {user?.name} 👋</h1>
                    <p className="text-xs text-gray-500 mt-1">Manage your tournaments, players and more — all in one place.</p>
                </div>

                <div className="flex items-center gap-3">
                    {fetchedAt && (
                        <span className="text-xs text-gray-400">Updated {ago(fetchedAt)}</span>
                    )}

                    <button
                        type="button"
                        onClick={refresh}
                        disabled={loading}
                        title="Count everything again"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-regx-orange hover:text-regx-orange disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
               
                <StatCard
                    title="Total Revenue"
                    value={money(stats?.revenue.total)}
                    trend={
                        stats?.revenue.changePct === null || stats?.revenue.changePct === undefined
                            ? `${money(stats?.revenue.window)} · 30d`
                            : `${stats.revenue.changePct > 0 ? '+' : ''}${stats.revenue.changePct}% · 30d`
                    }
                    bgColor="bg-green-50/50" iconColor="bg-green-100 text-green-600" textColor="text-green-600"
                    icon={<IndianRupee className="w-5 h-5" />}
                />
                <StatCard
                    title="Total Events"
                    value={stats?.events.total ?? '—'}
                    trend={`${stats?.events.upcoming ?? 0} upcoming`}
                    bgColor="bg-purple-50/50" iconColor="bg-purple-100 text-purple-600" textColor="text-purple-600"
                    icon={<Trophy className="w-5 h-5" />}
                />
                <StatCard
                    title="Registration Forms"
                    value={stats?.forms.total ?? '—'}
                    trend={`${stats?.forms.published ?? 0} published`}
                    bgColor="bg-orange-50/50" iconColor="bg-orange-100 text-orange-600" textColor="text-orange-600"
                    icon={<FileBarChart className="w-5 h-5" />}
                />
                <StatCard
                    title="Successful Payments"
                    value={stats?.paidPayments.count ?? '—'}
                    trend={money(stats?.paidPayments.amount)}
                    bgColor="bg-blue-50/50" iconColor="bg-blue-100 text-blue-600" textColor="text-blue-600"
                    icon={<CheckCircle2 className="w-5 h-5" />}
                />
                <StatCard
                    title="Pending Payments"
                    value={stats?.pendingPayments.count ?? '—'}
                    trend={money(stats?.pendingPayments.amount)}
                    bgColor="bg-red-50/50" iconColor="bg-red-100 text-red-600" textColor="text-red-600"
                    icon={<Clock className="w-5 h-5" />}
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-gray-900 text-sm xl:text-base">Registration Trend</h3>

                        <div className="flex items-center gap-2">
                            {/* The newest three forms, which is what anyone is watching. */}
                            <select
                                value={formId}
                                onChange={(e) => setFormId(e.target.value)}
                                className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none max-w-[9rem] truncate"
                            >
                                <option value="all">All forms</option>
                                {(trend?.forms ?? []).map((form) => (
                                    <option key={form.id} value={form.id}>{form.name}</option>
                                ))}
                            </select>

                            <select
                                value={period}
                                onChange={(e) => setPeriod(e.target.value)}
                                className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none"
                            >
                                {TREND_PERIODS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <DashboardChart
                        className="flex-1 min-h-[250px]"
                        type="area"
                        labels={(trend?.points ?? []).map((point) => point.label)}
                        values={(trend?.points ?? []).map((point) => point.count)}
                    />
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-gray-900 text-sm xl:text-base">Registrations by Category</h3>
                        <select
                            value={sportId}
                            onChange={(e) => setSportId(e.target.value)}
                            className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none max-w-[110px] truncate"
                        >
                            <option value="all">All sports</option>
                            {(categories?.sports ?? []).map((sport) => (
                                <option key={sport.id} value={sport.id}>{sport.name}</option>
                            ))}
                        </select>
                    </div>
                    <DashboardChart
                        className="flex-1 flex items-center justify-center min-h-[250px]"
                        type="donut"
                        items={(categories?.slices ?? []).map((slice) => ({ label: slice.label, value: slice.count }))}
                    />
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-gray-900 text-sm xl:text-base">Revenue Overview</h3>
                        <select
                            value={revenuePeriod}
                            onChange={(e) => setRevenuePeriod(e.target.value)}
                            className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none"
                        >
                            {REVENUE_PERIODS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <DashboardChart
                        className="flex-1 min-h-[250px]"
                        type="bar"
                        labels={(revenue?.points ?? []).map((point) => point.label)}
                        values={(revenue?.points ?? []).map((point) => point.total)}
                    />
                </div>
            </div>

            {/* Lists Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upcoming Events */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-gray-900">Upcoming Events</h3>
                        <a href="#" className="text-sm font-medium text-regx-orange hover:underline">View All &rarr;</a>
                    </div>
                    <div className="space-y-4">
                        {(activity?.upcomingEvents ?? []).length === 0 && (
                            <p className="text-sm text-gray-500 py-6 text-center">
                                {activity ? 'No published events coming up.' : 'Loading…'}
                            </p>
                        )}
                        {(activity?.upcomingEvents ?? []).map((ev, i) => (
                            <div key={ev.id ?? i} className="flex gap-3 items-center">
                                <div className="text-center min-w-[3rem]">
                                    <div className="text-[10px] font-bold text-gray-400">{ev.month}</div>
                                    <div className="text-lg font-bold text-gray-800 leading-none">{ev.day}</div>
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{ev.name}</h4>
                                    <div className="text-xs text-gray-500 mt-0.5 flex gap-2 items-center">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        {ev.location}
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ml-1 ${ev.status === 'Live' ? 'bg-green-50 text-green-600' : 'bg-purple-50 text-purple-600'}`}>{ev.status}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-gray-900">{ev.registrations}</div>
                                    <div className="text-[10px] text-gray-500">Registered</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Registrations */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-gray-900">Recent Registrations</h3>
                        <a href="#" className="text-sm font-medium text-regx-orange hover:underline">View All &rarr;</a>
                    </div>
                    <div className="space-y-4">
                        {(activity?.recentRegistrations ?? []).length === 0 && (
                            <p className="text-sm text-gray-500 py-6 text-center">
                                {activity ? 'No registrations yet.' : 'Loading…'}
                            </p>
                        )}
                        {(activity?.recentRegistrations ?? []).map((entry) => (
                            <div key={entry.id} className="flex items-center gap-3">
                                <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(entry.name)}`} className="w-8 h-8 rounded-full bg-gray-100" alt="" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-gray-900 truncate">{entry.name}</h4>
                                    <p className="text-xs text-gray-500 truncate">{entry.form} &bull; {ago(entry.createdAt)}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${entry.paymentStatus === 'paid' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                                    {entry.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                    <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3 flex-0">
                        <button className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg py-2 px-3 transition-colors border border-blue-100/50">
                            <Plus className="w-4 h-4 shrink-0" />
                            <span className="text-[11px] font-medium leading-tight text-left">Create Event</span>
                        </button>
                        <button className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg py-2 px-3 transition-colors border border-green-100/50">
                            <Upload className="w-4 h-4 shrink-0" />
                            <span className="text-[11px] font-medium leading-tight text-left">Import Registrations</span>
                        </button>
                        <button className="flex items-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg py-2 px-3 transition-colors border border-purple-100/50">
                            <IdCard className="w-4 h-4 shrink-0" />
                            <span className="text-[11px] font-medium leading-tight text-left">Generate ID Cards</span>
                        </button>
                        <button className="flex items-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg py-2 px-3 transition-colors border border-orange-100/50">
                            <FileBarChart className="w-4 h-4 shrink-0" />
                            <span className="text-[11px] font-medium leading-tight text-left">Create Certificate</span>
                        </button>
                        <button className="flex items-center gap-2 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-lg py-2 px-3 transition-colors border border-pink-100/50">
                            <Bell className="w-4 h-4 shrink-0" />
                            <span className="text-[11px] font-medium leading-tight text-left">Send Notifications</span>
                        </button>
                        <button className="flex items-center gap-2 bg-teal-50 hover:bg-teal-100 text-teal-600 rounded-lg py-2 px-3 transition-colors border border-teal-100/50">
                            <Download className="w-4 h-4 shrink-0" />
                            <span className="text-[11px] font-medium leading-tight text-left">Download Reports</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Third Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
                    <h3 className="font-semibold text-gray-900 mb-4">Event Status</h3>
                    <div className="grid grid-cols-4 gap-2 text-center">
                        {[
                            ['Upcoming', stats?.eventStatus.upcoming, 'text-blue-500'],
                            ['Live Now', stats?.eventStatus.live, 'text-red-500'],
                            ['Completed', stats?.eventStatus.completed, 'text-green-500'],
                            ['Drafts', stats?.eventStatus.drafts, 'text-gray-800'],
                        ].map(([label, value, colour]) => (
                            <div key={label}>
                                <div className={`text-2xl font-bold ${colour}`}>{value ?? '—'}</div>
                                <div className="text-xs text-gray-500 font-medium">{label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-gray-900">Top Teams</h3>
                        <a href="#" className="text-xs font-medium text-regx-orange hover:underline">View All &rarr;</a>
                    </div>
                    <div className="space-y-3">
                        {[
                            { name: 'Kasganj Pullers', count: 42, width: 'w-full' },
                            { name: 'Noida ArmForce', count: 36, width: 'w-[85%]' },
                            { name: 'UP Warriors', count: 28, width: 'w-[65%]' },
                            { name: 'Bareilly Strength', count: 24, width: 'w-[55%]' },
                            { name: 'Team Alpha', count: 20, width: 'w-[45%]' },
                        ].map((team, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="text-xs font-medium text-gray-600 w-28 truncate">{team.name}</div>
                                <div className="flex-1 bg-gray-100 rounded-full h-2">
                                    <div className={`bg-blue-500 h-2 rounded-full ${team.width}`}></div>
                                </div>
                                <div className="text-xs font-bold text-gray-700 w-6 text-right">{team.count}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-5">
                        <div className="flex flex-col gap-1.5">
                            <h3 className="font-semibold text-gray-900 leading-tight">System Status</h3>
                            <span className="flex items-center gap-1.5 text-[10px] font-medium text-green-700 bg-green-100 px-2 py-1 rounded w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                All Systems Operational
                            </span>
                        </div>
                        <a href="#" className="text-xs font-medium text-regx-orange hover:underline shrink-0 mt-0.5">View Details &rarr;</a>
                    </div>

                    <div className="flex justify-between text-center px-2">
                        <div>
                            <IdCard className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                            <div className="text-[10px] text-gray-500 font-medium">Registrations</div>
                            <div className="text-[10px] font-bold text-green-500">Online</div>
                        </div>
                        <div>
                            <IndianRupee className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                            <div className="text-[10px] text-gray-500 font-medium">Payments</div>
                            <div className="text-[10px] font-bold text-green-500">Online</div>
                        </div>
                        <div>
                            <svg className="w-5 h-5 mx-auto text-blue-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            <div className="text-[10px] text-gray-500 font-medium">Emails</div>
                            <div className="text-[10px] font-bold text-green-500">Online</div>
                        </div>
                        <div>
                            <FileBarChart className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                            <div className="text-[10px] text-gray-500 font-medium">Certificates</div>
                            <div className="text-[10px] font-bold text-green-500">Online</div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default Dashboard;

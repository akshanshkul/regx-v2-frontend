import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

/**
 * The dashboard's data, kept in the store rather than re-fetched.
 *
 * Every widget is a count across the organiser's whole account, so asking for
 * it again each time someone returns to the page is wasted work. What has been
 * loaded stays here for five minutes, and a request for something already fresh
 * never leaves the browser.
 *
 * Five minutes is the front of two caches: the server holds its own answer for
 * thirty, so a hard refresh costs one cheap request rather than a recount. Both
 * can be stepped over with force — a refresh button, say.
 */
export const FRESH_FOR_MS = 5 * 60 * 1000;

const readError = (error, fallback) =>
    error?.response?.data?.messages?.error || error?.response?.data?.message || fallback;

/** Whether the copy in the store can still be used. */
const isFresh = (entry) => Boolean(entry?.fetchedAt) && Date.now() - entry.fetchedAt < FRESH_FOR_MS;

/**
 * One thunk per widget, each keyed by the options it was asked with, so
 * switching a slicer back and forth does not re-fetch either side.
 */
const widget = (name, path, { key = () => 'default', params = () => ({}), pick } = {}) =>
    createAsyncThunk(
        `dashboard/${name}`,
        async (args = {}, { rejectWithValue }) => {
            try {
                const payload = await api.get(path, {
                    params: { ...params(args), ...(args.force ? { refresh: 1 } : {}) },
                });

                return { key: key(args), data: pick(payload), fetchedAt: Date.now() };
            } catch (error) {
                return rejectWithValue({ key: key(args), message: readError(error, `Could not load ${name}`) });
            }
        },
        {
            condition: (args = {}, { getState }) => {
                if (args.force) return true;

                const entry = getState().dashboard[name]?.[key(args)];

                // Already fresh, or already on its way.
                return !isFresh(entry) && !entry?.loading;
            },
        }
    );

export const fetchDashboardStats = widget('stats', '/dashboard/stats', {
    pick: (payload) => payload.stats,
});

export const fetchRegistrationTrend = widget('trend', '/dashboard/registrations', {
    key: ({ formId = 'all', period = '30d' }) => `${formId}:${period}`,
    params: ({ formId = 'all', period = '30d' }) => ({ formId, period }),
    pick: (payload) => payload.trend,
});

export const fetchRevenueOverview = widget('revenue', '/dashboard/revenue', {
    key: ({ period = '6m' }) => period,
    params: ({ period = '6m' }) => ({ period }),
    pick: (payload) => payload.revenue,
});

export const fetchCategoryBreakdown = widget('categories', '/dashboard/categories', {
    key: ({ typeId = 'all' }) => String(typeId),
    params: ({ typeId = 'all' }) => ({ typeId }),
    pick: (payload) => payload.categories,
});

export const fetchDashboardActivity = widget('activity', '/dashboard/activity', {
    pick: (payload) => ({
        upcomingEvents: payload.upcomingEvents ?? [],
        recentRegistrations: payload.recentRegistrations ?? [],
    }),
});

const WIDGETS = {
    stats: fetchDashboardStats,
    trend: fetchRegistrationTrend,
    revenue: fetchRevenueOverview,
    categories: fetchCategoryBreakdown,
    activity: fetchDashboardActivity,
};

const initialState = {
    stats: {},
    trend: {},
    revenue: {},
    categories: {},
    activity: {},
};

const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        /** Forget everything — on sign-out, or when the account's data changed. */
        clearDashboard: () => initialState,
    },
    extraReducers: (builder) => {
        builder.addCase('auth/clearAuth', () => initialState);

        Object.entries(WIDGETS).forEach(([name, thunk]) => {
            builder
                .addCase(thunk.pending, (state, action) => {
                    const key = keyOf(name, action.meta.arg);

                    state[name][key] = { ...(state[name][key] ?? {}), loading: true, error: null };
                })
                .addCase(thunk.fulfilled, (state, action) => {
                    state[name][action.payload.key] = {
                        loading: false,
                        error: null,
                        data: action.payload.data,
                        fetchedAt: action.payload.fetchedAt,
                    };
                })
                .addCase(thunk.rejected, (state, action) => {
                    const key = action.payload?.key ?? keyOf(name, action.meta.arg);

                    state[name][key] = {
                        ...(state[name][key] ?? {}),
                        loading: false,
                        error: action.payload?.message ?? 'Could not load this',
                    };
                });
        });
    },
});

/** The same key the thunk uses, for the pending and rejected cases. */
const keyOf = (name, args = {}) => {
    if (name === 'trend') return `${args?.formId ?? 'all'}:${args?.period ?? '30d'}`;
    if (name === 'revenue') return args?.period ?? '6m';
    if (name === 'categories') return String(args?.typeId ?? 'all');

    return 'default';
};

export const { clearDashboard } = dashboardSlice.actions;

/** Whether anything on the dashboard is currently loading. */
export const selectDashboardLoading = (state) =>
    Object.values(state.dashboard).some((group) => Object.values(group).some((entry) => entry?.loading));

/** When the headline figures were last counted. */
export const selectDashboardFetchedAt = (state) => state.dashboard.stats?.default?.fetchedAt ?? null;

/** Read one widget's slot: { data, loading, error, fetchedAt }, or undefined. */
export const selectWidget = (name, args) => (state) => state.dashboard[name]?.[keyOf(name, args)];

export default dashboardSlice.reducer;

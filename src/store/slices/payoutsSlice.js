import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

/**
 * Payouts: the balance, the accounts money can be sent to, and the history.
 *
 * Anything that changes a payout or an account returns the fresh balance and
 * account list with it, so the page never has to re-ask after acting.
 */

const readError = (error, fallback) =>
    error?.response?.data?.messages?.error ||
    Object.values(error?.response?.data?.messages ?? {})[0] ||
    error?.response?.data?.message ||
    fallback;

const call = (name, request) =>
    createAsyncThunk(`payouts/${name}`, async (args, { rejectWithValue }) => {
        try {
            return await request(args ?? {});
        } catch (error) {
            return rejectWithValue(readError(error, 'Something went wrong with payouts'));
        }
    });

export const fetchPayoutOverview = call('overview', () => api.get('/payouts/overview'));
export const fetchBanks = call('banks', () => api.get('/payouts/banks'));
export const fetchPayoutHistory = call('history', (params) => api.get('/payouts', { params }));

export const savePayoutAccount = call('saveAccount', ({ id, ...account }) =>
    id ? api.put(`/payouts/accounts/${id}`, account) : api.post('/payouts/accounts', account)
);

export const deletePayoutAccount = call('deleteAccount', ({ id }) => api.delete(`/payouts/accounts/${id}`));
export const verifyPayoutAccount = call('verifyAccount', ({ id }) => api.post(`/payouts/accounts/${id}/verify`));
export const savePayoutSettings = call('saveSettings', (settings) => api.put('/payouts/settings', settings));
export const makePayoutAccountDefault = call('defaultAccount', ({ id }) => api.post(`/payouts/accounts/${id}/default`));
export const requestPayout = call('request', (body) => api.post('/payouts', body));
export const cancelPayout = call('cancel', ({ id }) => api.post(`/payouts/${id}/cancel`));

const initialState = {
    balance: null,
    accounts: [],
    settings: null,
    summary: null,
    banks: [],
    history: [],
    meta: null,
    loading: false,
    saving: false,
    error: null,
};

/** Every action that changes something answers with the new balance and accounts. */
const applyChange = (state, action) => {
    state.saving = false;
    state.error = null;

    if (action.payload?.balance) state.balance = action.payload.balance;
    if (action.payload?.accounts) state.accounts = action.payload.accounts;
    if (action.payload?.settings) state.settings = action.payload.settings;
};

const payoutsSlice = createSlice({
    name: 'payouts',
    initialState,
    reducers: {
        clearPayouts: () => initialState,
        clearPayoutError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase('auth/clearAuth', () => initialState)

            .addCase(fetchPayoutOverview.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPayoutOverview.fulfilled, (state, action) => {
                state.loading = false;
                state.balance = action.payload.balance;
                state.accounts = action.payload.accounts ?? [];
                state.settings = action.payload.settings ?? null;
                state.summary = action.payload.summary;
            })
            .addCase(fetchPayoutOverview.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(fetchBanks.fulfilled, (state, action) => {
                state.banks = action.payload.banks ?? [];
            })

            .addCase(fetchPayoutHistory.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchPayoutHistory.fulfilled, (state, action) => {
                state.loading = false;
                state.history = action.payload.data ?? [];
                state.meta = action.payload.meta ?? null;
            })
            .addCase(fetchPayoutHistory.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Everything that writes shares one pending/fulfilled/rejected shape.
        [
            savePayoutAccount, deletePayoutAccount, makePayoutAccountDefault,
            verifyPayoutAccount, savePayoutSettings, requestPayout, cancelPayout,
        ].forEach((thunk) => {
            builder
                .addCase(thunk.pending, (state) => {
                    state.saving = true;
                    state.error = null;
                })
                .addCase(thunk.fulfilled, applyChange)
                .addCase(thunk.rejected, (state, action) => {
                    state.saving = false;
                    state.error = action.payload;
                });
        });
    },
});

export const { clearPayouts, clearPayoutError } = payoutsSlice.actions;

export default payoutsSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

const readError = (error, fallback) => {
    const messages = error?.response?.data?.messages;
    if (messages) return Object.values(messages).join(', ');
    return error?.response?.data?.message || fallback;
};

export const fetchSettings = createAsyncThunk(
    'settings/fetch',
    async (_, { rejectWithValue }) => {
        try {
            const [settings, options] = await Promise.all([
                api.get('/user/settings'),
                api.get('/user/settings/options'),
            ]);
            return {
                settings: settings.data,
                options: options.data,
                paymentGateways: settings.paymentGateway ?? [],
            };
        } catch (error) {
            return rejectWithValue(readError(error, 'Failed to load settings'));
        }
    },
    {
        condition: (_, { getState }) => getState().settings.status !== 'loading',
    }
);

export const saveSettings = createAsyncThunk(
    'settings/save',
    async (values, { rejectWithValue }) => {
        try {
            const response = await api.put('/user/settings', values);
            return response.data;
        } catch (error) {
            return rejectWithValue(readError(error, 'Failed to save settings'));
        }
    }
);

const initialState = {
    values: null,
    options: null,
    paymentGateways: null,
    status: 'idle',
    saveStatus: 'idle',
    error: null,
    // Local edits not yet sent to the server.
    isDirty: false,
};

const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        // Local edit — nothing hits the network until saveSettings runs.
        setSetting(state, action) {
            const { key, value } = action.payload;
            if (!state.values) return;
            state.values[key] = value;
            state.isDirty = true;
        },
        setPaymentGateways(state, action) {
            state.paymentGateways = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchSettings.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchSettings.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.values = action.payload.settings;
                state.options = action.payload.options;
                state.paymentGateways = action.payload.paymentGateways;
                state.isDirty = false;
            })
            .addCase(fetchSettings.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload ?? 'Failed to load settings';
            })

            .addCase(saveSettings.pending, (state) => {
                state.saveStatus = 'saving';
            })
            .addCase(saveSettings.fulfilled, (state, action) => {
                state.saveStatus = 'succeeded';
                state.values = action.payload;
                state.isDirty = false;
            })
            .addCase(saveSettings.rejected, (state, action) => {
                state.saveStatus = 'failed';
                state.error = action.payload ?? 'Failed to save settings';
            });
    },
});

export const { setSetting, setPaymentGateways } = settingsSlice.actions;

export const selectSettings = (state) => state.settings.values;
export const selectSettingsOptions = (state) => state.settings.options;
export const selectSettingsStatus = (state) => state.settings.status;
export const selectSettingsSaving = (state) => state.settings.saveStatus === 'saving';
export const selectSettingsDirty = (state) => state.settings.isDirty;
export const selectPaymentGateways = (state) => state.settings.paymentGateways;

export default settingsSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { clearAuth } from './authSlice';

const readData = (response) => response?.data ?? response ?? {};

export const fetchCertificates = createAsyncThunk(
    'certificates/fetchCertificates',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/certificates');

            return readData(response).collections ?? [];
        } catch (error) {
            return rejectWithValue(error?.response?.data?.message || 'Could not load the collections.');
        }
    },
    {
        condition: (_, { getState }) => {
            const state = getState().certificates;

            return state.status !== 'loading' && !state.loaded;
        },
    }
);

export const refreshCertificates = createAsyncThunk(
    'certificates/refreshCertificates',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/certificates');

            return readData(response).collections ?? [];
        } catch (error) {
            return rejectWithValue(error?.response?.data?.message || 'Could not load the collections.');
        }
    }
);

export const fetchCertificateForms = createAsyncThunk(
    'certificates/fetchCertificateForms',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/events/forms/list');

            return readData(response);
        } catch (error) {
            return rejectWithValue(error?.response?.data?.message || 'Could not load the forms.');
        }
    },
    {
        condition: (_, { getState }) => {
            const state = getState().certificates;

            return state.formsStatus !== 'loading' && !state.formsLoaded;
        },
    }
);

export const createCertificate = createAsyncThunk(
    'certificates/createCertificate',
    async (payload, { rejectWithValue }) => {
        try {
            return await api.post('/certificates', payload);
        } catch (error) {
            return rejectWithValue(error?.response?.data?.message || 'Could not create the collection.');
        }
    }
);

export const deleteCertificate = createAsyncThunk(
    'certificates/deleteCertificate',
    async (id, { rejectWithValue }) => {
        try {
            return await api.delete(`/certificates/${id}`);
        } catch (error) {
            return rejectWithValue(error?.response?.data?.message || 'Could not delete the collection.');
        }
    }
);

export const uploadCertificateTemplate = createAsyncThunk(
    'certificates/uploadCertificateTemplate',
    async ({ id, body }, { rejectWithValue }) => {
        try {
            return await api.post(`/certificates/${id}/template`, body);
        } catch (error) {
            return rejectWithValue(error?.response?.data?.message || 'Could not upload the template.');
        }
    }
);

export const sendCertificateData = createAsyncThunk(
    'certificates/sendCertificateData',
    async ({ id, rows }, { rejectWithValue }) => {
        try {
            // Without rows the server takes everyone on the form, split as the collection says.
            return await api.post(`/certificates/${id}/data`, rows ? { rows } : {});
        } catch (error) {
            return rejectWithValue(error?.response?.data?.message || 'Could not send the recipients.');
        }
    }
);

export const generateCertificates = createAsyncThunk(
    'certificates/generateCertificates',
    async (id, { rejectWithValue }) => {
        try {
            return await api.post(`/certificates/${id}/generate`, {});
        } catch (error) {
            return rejectWithValue(error?.response?.data?.message || 'Could not generate the certificates.');
        }
    }
);

const certificateSlice = createSlice({
    name: 'certificates',
    initialState: {
        collections: [],
        status: 'idle',
        error: null,
        loaded: false,
        forms: [],
        formsStatus: 'idle',
        formsError: null,
        formsLoaded: false,
    },
    reducers: {
        resetCertificates: (state) => {
            state.collections = [];
            state.status = 'idle';
            state.error = null;
            state.loaded = false;
            state.forms = [];
            state.formsStatus = 'idle';
            state.formsError = null;
            state.formsLoaded = false;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(clearAuth, (state) => {
                state.collections = [];
                state.status = 'idle';
                state.error = null;
                state.loaded = false;
                state.forms = [];
                state.formsStatus = 'idle';
                state.formsError = null;
                state.formsLoaded = false;
            })
            .addCase(fetchCertificates.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchCertificates.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.loaded = true;
                state.collections = action.payload;
            })
            .addCase(fetchCertificates.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload || action.error.message;
            })
            .addCase(refreshCertificates.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(refreshCertificates.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.loaded = true;
                state.collections = action.payload;
            })
            .addCase(refreshCertificates.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload || action.error.message;
            })
            .addCase(fetchCertificateForms.pending, (state) => {
                state.formsStatus = 'loading';
                state.formsError = null;
            })
            .addCase(fetchCertificateForms.fulfilled, (state, action) => {
                state.formsStatus = 'succeeded';
                state.formsLoaded = true;
                state.forms = Array.isArray(action.payload) ? action.payload : [];
            })
            .addCase(fetchCertificateForms.rejected, (state, action) => {
                state.formsStatus = 'failed';
                state.formsError = action.payload || action.error.message;
            });
    },
});

export const { resetCertificates } = certificateSlice.actions;

export default certificateSlice.reducer;

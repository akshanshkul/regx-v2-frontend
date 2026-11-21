import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

const TOKEN_KEY = 'regx_token';

/**
 * The API layer already unwraps to the response body, so `response` here is
 * `{ success, data, message }`.
 */
const unwrapAuth = (response, fallbackMessage) => {
    if (!response?.success) {
        throw new Error(response?.message || fallbackMessage);
    }

    localStorage.setItem(TOKEN_KEY, response.data.token);
    return response;
};

/**
 * Runs once on boot: if a token is present, exchange it for the current user.
 */
export const initAuth = createAsyncThunk('auth/init', async (_, { rejectWithValue }) => {
    if (!localStorage.getItem(TOKEN_KEY)) {
        return null;
    }

    try {
        const response = await api.get('/auth/me');
        return response.success ? response.data.user : null;
    } catch (error) {
        // An invalid or expired token is not an app error; just sign out.
        localStorage.removeItem(TOKEN_KEY);
        return rejectWithValue(null);
    }
});

export const login = createAsyncThunk('auth/login', async ({ email, password }) => {
    const response = await api.post('/auth/login', { email, password });
    return unwrapAuth(response, 'Login failed');
});

export const signup = createAsyncThunk('auth/signup', async ({ name, email, password, sports = [] }) => {
    const response = await api.post('/auth/register', { name, email, password, sports });
    return unwrapAuth(response, 'Signup failed');
});

export const googleLogin = createAsyncThunk('auth/googleLogin', async ({ idToken, intent, acceptedTerms }) => {
    try {
        const response = await api.post('/auth/google', {
            id_token: idToken,
            intent,
            accepted_terms: acceptedTerms,
        });
        return unwrapAuth(response, 'Google login failed');
    } catch (error) {
        throw error.response ? serverError(error, 'Google sign-in failed') : error;
    }
});

/**
 * The server's own words for a failed request — a field message such as
 * "That code is not right. 3 tries left.", or its general message — rather
 * than axios's "Request failed with status code 400". The field it was about
 * travels as `code` — the one extra property Redux Toolkit keeps when it
 * passes a thunk's error on — so a form can put it under the right box.
 */
const serverError = (error, fallback) => {
    const data = error?.response?.data;
    const fields = data?.messages && typeof data.messages === 'object' ? data.messages : {};
    const [field, text] = Object.entries(fields)[0] ?? [];

    const failure = new Error(text || data?.message || fallback);
    if (field && field !== 'error') failure.code = field;
    return failure;
};

export const forgotPassword = createAsyncThunk('auth/forgotPassword', async (email) => {
    try {
        const response = await api.post('/auth/forgot-password', { email });
        if (!response?.success) throw new Error(response?.message || 'Could not send the code');
        return response;
    } catch (error) {
        throw error.response ? serverError(error, 'Could not send the code') : error;
    }
});

export const resetPassword = createAsyncThunk(
    'auth/resetPassword',
    async ({ email, otp, new_password }) => {
        try {
            const response = await api.post('/auth/reset-password', { email, otp, new_password });
            if (!response?.success) throw new Error(response?.message || 'Could not reset the password');
            return response;
        } catch (error) {
            throw error.response ? serverError(error, 'Could not reset the password') : error;
        }
    }
);

export const refreshUser = createAsyncThunk('auth/refreshUser', async () => {
    const response = await api.get('/auth/me');
    return response.success ? response.data.user : null;
});

const initialState = {
    user: null,
    isAuthenticated: false,
    // True until the boot check finishes, so route guards do not bounce a
    // signed-in user to the login page on a hard refresh.
    loading: true,
};

const signedIn = (state, action) => {
    state.user = action.payload.data.user;
    state.isAuthenticated = true;
    state.loading = false;
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearAuth(state) {
            localStorage.removeItem(TOKEN_KEY);
            state.user = null;
            state.isAuthenticated = false;
            state.loading = false;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(initAuth.fulfilled, (state, action) => {
                state.user = action.payload;
                state.isAuthenticated = Boolean(action.payload);
                state.loading = false;
            })
            .addCase(initAuth.rejected, (state) => {
                state.user = null;
                state.isAuthenticated = false;
                state.loading = false;
            })
            .addCase(login.fulfilled, signedIn)
            .addCase(signup.fulfilled, signedIn)
            .addCase(googleLogin.fulfilled, signedIn)
            .addCase(refreshUser.fulfilled, (state, action) => {
                if (action.payload) state.user = action.payload;
            });
    },
});

export const { clearAuth } = authSlice.actions;

export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;

export default authSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

const message = (error, fallback) => error?.response?.data?.message || fallback;

/** The latest notifications, newest first, with the unread count. */
export const fetchNotifications = createAsyncThunk(
    'notifications/fetch',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/notifications', { params: { limit: 50 } });
            return { items: response.data || [], unread: response.unread ?? 0 };
        } catch (error) {
            return rejectWithValue(message(error, 'Could not load notifications'));
        }
    }
);

/** Just the number — what the bell asks for every so often. */
export const fetchUnreadCount = createAsyncThunk(
    'notifications/unread',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/notifications/unread-count');
            return response.unread ?? 0;
        } catch (error) {
            return rejectWithValue(message(error, 'Could not check notifications'));
        }
    }
);

export const markNotificationRead = createAsyncThunk(
    'notifications/read',
    async (id, { rejectWithValue }) => {
        try {
            const response = await api.put(`/notifications/${id}/read`);
            return { id, unread: response.unread ?? 0 };
        } catch (error) {
            return rejectWithValue(message(error, 'Could not mark it as read'));
        }
    }
);

export const markAllNotificationsRead = createAsyncThunk(
    'notifications/readAll',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.post('/notifications/read-all');
            return response.unread ?? 0;
        } catch (error) {
            return rejectWithValue(message(error, 'Could not mark them as read'));
        }
    }
);

export const clearNotifications = createAsyncThunk(
    'notifications/clear',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.delete('/notifications');
            return response.unread ?? 0;
        } catch (error) {
            return rejectWithValue(message(error, 'Could not clear notifications'));
        }
    }
);

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState: { items: [], unread: 0, status: 'idle' },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchNotifications.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchNotifications.fulfilled, (state, { payload }) => {
                state.items = payload.items;
                state.unread = payload.unread;
                state.status = 'succeeded';
            })
            .addCase(fetchNotifications.rejected, (state) => {
                state.status = 'failed';
            })
            .addCase(fetchUnreadCount.fulfilled, (state, { payload }) => {
                state.unread = payload;
            })
            .addCase(markNotificationRead.fulfilled, (state, { payload }) => {
                const item = state.items.find((n) => n.id === payload.id);

                if (item && !item.read_at) item.read_at = new Date().toISOString();

                state.unread = payload.unread;
            })
            .addCase(markAllNotificationsRead.fulfilled, (state, { payload }) => {
                const now = new Date().toISOString();

                state.items.forEach((n) => { n.read_at ??= now; });
                state.unread = payload;
            })
            .addCase(clearNotifications.fulfilled, (state, { payload }) => {
                state.items = [];
                state.unread = payload;
            });
    },
});

export const selectNotifications = (state) => state.notifications.items;
export const selectUnreadCount = (state) => state.notifications.unread;
export const selectNotificationsStatus = (state) => state.notifications.status;

export default notificationsSlice.reducer;

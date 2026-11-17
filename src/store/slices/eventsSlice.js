import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import api from '../../services/api';

/**
 * Builds the multipart body the API expects. Files are optional — only send
 * what the user actually picked.
 */
const toFormData = ({ fields, logoFile, bannerFile }) => {
    const body = new FormData();

    Object.entries(fields).forEach(([key, value]) => {
        body.append(key, value ?? '');
    });

    if (logoFile) body.append('logo', logoFile);
    if (bannerFile) body.append('banner', bannerFile);

    return body;
};

const readError = (error, fallback) => {
    const messages = error?.response?.data?.messages;
    if (messages) return Object.values(messages).join(', ');
    return error?.response?.data?.message || fallback;
};

export const fetchEvents = createAsyncThunk(
    'events/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/events');
            return response.data || [];
        } catch (error) {
            return rejectWithValue(readError(error, 'Failed to load events'));
        }
    },
    {
        // Skip the request entirely if the list is already cached and fresh.
        condition: (_, { getState }) => {
            const { status, lastFetched } = getState().events;
            if (status === 'loading') return false;
            if (status === 'succeeded' && lastFetched && Date.now() - lastFetched < 30_000) {
                return false;
            }
            return true;
        },
    }
);

export const fetchEvent = createAsyncThunk(
    'events/fetchOne',
    async (id, { rejectWithValue }) => {
        try {
            const response = await api.get(`/events/${id}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(readError(error, 'Failed to load event details'));
        }
    }
);

export const createEvent = createAsyncThunk(
    'events/create',
    async (payload, { rejectWithValue }) => {
        try {
            const response = await api.post('/events', toFormData(payload));
            return response.data;
        } catch (error) {
            return rejectWithValue(readError(error, 'Failed to save event'));
        }
    }
);

export const updateEvent = createAsyncThunk(
    'events/update',
    async ({ id, ...payload }, { rejectWithValue }) => {
        try {
            // POST, not PUT: PHP cannot parse a multipart PUT body.
            const response = await api.post(`/events/${id}`, toFormData(payload));
            return response.data;
        } catch (error) {
            return rejectWithValue(readError(error, 'Failed to update event'));
        }
    }
);

export const deleteEvent = createAsyncThunk(
    'events/delete',
    async (id, { rejectWithValue }) => {
        try {
            await api.delete(`/events/${id}`);
            return id;
        } catch (error) {
            return rejectWithValue(readError(error, 'Failed to delete event'));
        }
    }
);

const initialState = {
    items: [],
    // Detail records keyed by id, so revisiting an event is instant.
    byId: {},
    status: 'idle', // idle | loading | succeeded | failed
    detailStatus: 'idle',
    error: null,
    lastFetched: null,
};

/**
 * Keeps the list and the detail cache in step after a write, so every screen
 * showing this event updates without another round trip.
 */
const upsert = (state, event) => {
    if (!event?.id) return;

    state.byId[event.id] = { ...state.byId[event.id], ...event };

    const index = state.items.findIndex((item) => String(item.id) === String(event.id));
    if (index === -1) {
        state.items.unshift(event);
    } else {
        state.items[index] = { ...state.items[index], ...event };
    }
};

const eventsSlice = createSlice({
    name: 'events',
    initialState,
    reducers: {
        // Forces the next fetchEvents to hit the network despite the cache window.
        invalidateEvents(state) {
            state.lastFetched = null;
        },
        // Optimistic local status change, used by the events list.
        setEventStatus(state, action) {
            const { id, status } = action.payload;
            const event = state.items.find((item) => String(item.id) === String(id));
            if (event) event.status = status;
            if (state.byId[id]) state.byId[id].status = status;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchEvents.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchEvents.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.items = action.payload;
                state.lastFetched = Date.now();
                action.payload.forEach((event) => {
                    state.byId[event.id] = { ...state.byId[event.id], ...event };
                });
            })
            .addCase(fetchEvents.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload ?? 'Failed to load events';
            })

            .addCase(fetchEvent.pending, (state) => {
                state.detailStatus = 'loading';
                state.error = null;
            })
            .addCase(fetchEvent.fulfilled, (state, action) => {
                state.detailStatus = 'succeeded';
                upsert(state, action.payload);
            })
            .addCase(fetchEvent.rejected, (state, action) => {
                state.detailStatus = 'failed';
                state.error = action.payload ?? 'Failed to load event details';
            })

            .addCase(createEvent.fulfilled, (state, action) => {
                upsert(state, action.payload);
            })
            .addCase(updateEvent.fulfilled, (state, action) => {
                upsert(state, action.payload);
            })
            .addCase(deleteEvent.fulfilled, (state, action) => {
                const id = action.payload;
                state.items = state.items.filter((item) => String(item.id) !== String(id));
                delete state.byId[id];
            });
    },
});

export const { invalidateEvents, setEventStatus } = eventsSlice.actions;

export const selectEvents = (state) => state.events.items;
export const selectEventsStatus = (state) => state.events.status;
export const selectEventsError = (state) => state.events.error;
export const selectEventDetailStatus = (state) => state.events.detailStatus;
export const selectEventById = (id) => (state) => state.events.byId[id] ?? null;

/**
 * Case-insensitive search across the fields a user would actually type.
 * Memoised so typing does not re-filter on unrelated renders.
 */
export const makeSelectFilteredEvents = () =>
    createSelector(
        [selectEvents, (_, query) => query],
        (events, query) => {
            const q = (query || '').trim().toLowerCase();
            if (!q) return events;

            return events.filter((event) =>
                [event.name, event.type, event.subtype, event.venue, event.state, event.status]
                    .filter(Boolean)
                    .some((field) => String(field).toLowerCase().includes(q))
            );
        }
    );

export default eventsSlice.reducer;

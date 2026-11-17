import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

/**
 * The API sometimes returns the array directly and sometimes wrapped; normalise
 * both shapes here so no component has to guess.
 */
const toArray = (response) => {
    const data = response?.data ?? response;
    if (Array.isArray(data)) return data;
    return Array.isArray(data?.data) ? data.data : [];
};

export const fetchEventTypes = createAsyncThunk(
    'eventTypes/fetchTypes',
    async () => toArray(await api.get('/event-types?status=1')),
    {
        // Lookup data barely changes — fetch it once per session.
        condition: (_, { getState }) => getState().eventTypes.typesStatus === 'idle',
    }
);

export const fetchEventSubtypes = createAsyncThunk(
    'eventTypes/fetchSubtypes',
    // Keyed by the parent type's id, matching what events now store.
    async (typeId) => ({
        type: typeId,
        subtypes: toArray(await api.get(`/event-subtypes?status=1&type_id=${encodeURIComponent(typeId)}`)),
    }),
    {
        condition: (type, { getState }) => {
            if (!type) return false;
            // Already cached for this type.
            return getState().eventTypes.subtypesByType[type] === undefined;
        },
    }
);

export const fetchOrganizationRelations = createAsyncThunk(
    'eventTypes/fetchRelations',
    async () => {
        const response = await api.get('/events/relations');
        return response.data ?? [];
    },
    {
        condition: (_, { getState }) => getState().eventTypes.relationsStatus === 'idle',
    }
);

const initialState = {
    types: [],
    typesStatus: 'idle',
    // How an organisation can be tied to an event, served by the API so the
    // client never sends a key the server would reject.
    relations: [],
    relationsStatus: 'idle',
    // Keyed by type name, so switching back and forth is instant.
    subtypesByType: {},
    subtypesStatus: 'idle',
};

const eventTypesSlice = createSlice({
    name: 'eventTypes',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchEventTypes.pending, (state) => {
                state.typesStatus = 'loading';
            })
            .addCase(fetchEventTypes.fulfilled, (state, action) => {
                state.typesStatus = 'succeeded';
                state.types = action.payload;
            })
            .addCase(fetchEventTypes.rejected, (state) => {
                state.typesStatus = 'failed';
            })

            .addCase(fetchEventSubtypes.pending, (state) => {
                state.subtypesStatus = 'loading';
            })
            .addCase(fetchEventSubtypes.fulfilled, (state, action) => {
                state.subtypesStatus = 'succeeded';
                state.subtypesByType[action.payload.type] = action.payload.subtypes;
            })
            .addCase(fetchEventSubtypes.rejected, (state) => {
                state.subtypesStatus = 'failed';
            })

            .addCase(fetchOrganizationRelations.pending, (state) => {
                state.relationsStatus = 'loading';
            })
            .addCase(fetchOrganizationRelations.fulfilled, (state, action) => {
                state.relationsStatus = 'succeeded';
                state.relations = action.payload;
            })
            .addCase(fetchOrganizationRelations.rejected, (state) => {
                state.relationsStatus = 'failed';
            });
    },
});

export const selectEventTypes = (state) => state.eventTypes.types;
export const selectEventTypesStatus = (state) => state.eventTypes.typesStatus;
export const selectOrganizationRelations = (state) => state.eventTypes.relations;
export const selectSubtypesFor = (type) => (state) =>
    state.eventTypes.subtypesByType[type] ?? [];

export default eventTypesSlice.reducer;

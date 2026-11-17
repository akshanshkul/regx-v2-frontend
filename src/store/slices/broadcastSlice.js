import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../services/api";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const readError = (error, fallback) => {
    const messages = error?.response?.data?.messages;

    if (messages) {
        return Object.values(messages).join(", ");
    }

    return (
        error?.response?.data?.message ||
        error?.message ||
        fallback
    );
};

const unwrapResponse = (response) => {
    return response?.data ?? response;
};

/*
|--------------------------------------------------------------------------
| Initial State
|--------------------------------------------------------------------------
*/

const initialState = {
    items: [],
    recipients: [],

    loading: false,
    recipientsLoading: false,
    creating: false,

    error: null,
};

/*
|--------------------------------------------------------------------------
| Fetch Broadcasts
|--------------------------------------------------------------------------
*/

export const fetchBroadcasts = createAsyncThunk(
    "broadcast/fetchBroadcasts",

    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get("/broadcasts");

            return unwrapResponse(response);
        } catch (error) {
            return rejectWithValue(
                readError(
                    error,
                    "Failed to load broadcasts"
                )
            );
        }
    }
);

/*
|--------------------------------------------------------------------------
| Fetch Event Recipients
|--------------------------------------------------------------------------
*/

export const fetchEventBroadcastRecipients =
    createAsyncThunk(
        "broadcast/fetchEventBroadcastRecipients",

        async (eventId, { rejectWithValue }) => {
            try {
                const response = await api.get(
                    `/events/${eventId}/broadcast-recipients`
                );

                return unwrapResponse(response);
            } catch (error) {
                return rejectWithValue(
                    readError(
                        error,
                        "Failed to load event recipients"
                    )
                );
            }
        }
    );

/*
|--------------------------------------------------------------------------
| Fetch Form Recipients
|--------------------------------------------------------------------------
*/

export const fetchFormBroadcastRecipients =
    createAsyncThunk(
        "broadcast/fetchFormRecipients",

        async (formId, { rejectWithValue }) => {
            try {
                const response = await api.get(
                    `/forms/${formId}/broadcast-recipients`
                );

                return unwrapResponse(response);
            } catch (error) {
                return rejectWithValue(
                    readError(
                        error,
                        "Failed to load form recipients"
                    )
                );
            }
        }
    );

/*
|--------------------------------------------------------------------------
| Create Broadcast
|--------------------------------------------------------------------------
| NOTE:
|   We accept the FormData wrapped inside a plain object
|   ({ formData }) so the thunk signature stays consistent.
|   FormData itself is non-serializable, so the store's
|   serializableCheck must ignore these specific actions.
|--------------------------------------------------------------------------
*/
export const createBroadcast = createAsyncThunk(
    "broadcast/create",
    async (formData, { rejectWithValue }) => {
        try {
            const response = await api.post(
                "/broadcasts",
                formData
            );

            console.log(
                "CREATE API RESPONSE:",
                response
            );

            /*
             * Support both:
             *
             * Axios:
             * response.data.data.broadcast
             *
             * Already-unwrapped API:
             * response.data.broadcast
             *
             * Also fallback to response.data.data
             * or response.data.
             */
            const broadcast =
                response?.data?.data?.broadcast ??
                response?.data?.broadcast ??
                response?.data?.data ??
                response?.data ??
                null;

            console.log(
                "CREATE BROADCAST:",
                broadcast
            );

            return broadcast;

        } catch (error) {
            console.error(
                "CREATE BROADCAST ERROR:",
                error
            );

            return rejectWithValue(
                readError(
                    error,
                    "Failed to create broadcast"
                )
            );
        }
    }
);

/*
|--------------------------------------------------------------------------
| Send Broadcast
|--------------------------------------------------------------------------
*/

export const sendBroadcast = createAsyncThunk(
    "broadcast/send",

    async (publicId, { rejectWithValue }) => {
        try {
            const response = await api.post(
                `/broadcasts/${publicId}/send`
            );

            return unwrapResponse(response);
        } catch (error) {
            return rejectWithValue(
                readError(
                    error,
                    "Failed to send broadcast"
                )
            );
        }
    }
);

/*
|--------------------------------------------------------------------------
| Delete Broadcast
|--------------------------------------------------------------------------
*/

export const deleteBroadcast = createAsyncThunk(
    "broadcast/delete",

    async (publicId, { rejectWithValue }) => {
        try {
            await api.delete(`/broadcasts/${publicId}`);

            return publicId;
        } catch (error) {
            return rejectWithValue(
                readError(error, "Failed to delete broadcast")
            );
        }
    }
);

/*
|--------------------------------------------------------------------------
| Slice
|--------------------------------------------------------------------------
*/

const broadcastSlice = createSlice({
    name: "broadcast",

    initialState,

    reducers: {
        clearBroadcastRecipients: (state) => {
            state.recipients = [];
            state.recipientsLoading = false;
        },

        clearBroadcastError: (state) => {
            state.error = null;
        },

        clearBroadcasts: (state) => {
            state.items = [];
        },
    },

    extraReducers: (builder) => {
        builder

            /*
            |--------------------------------------------------------------------------
            | Fetch Broadcasts
            |--------------------------------------------------------------------------
            */

            .addCase(
                fetchBroadcasts.pending,
                (state) => {
                    state.loading = true;
                    state.error = null;
                }
            )

            .addCase(
                fetchBroadcasts.fulfilled,
                (state, action) => {
                    state.loading = false;

                    const payload = action.payload;

                    if (Array.isArray(payload)) {
                        state.items = payload;
                    } else if (
                        Array.isArray(payload?.data)
                    ) {
                        state.items = payload.data;
                    } else {
                        state.items = [];
                    }
                }
            )

            .addCase(
                fetchBroadcasts.rejected,
                (state, action) => {
                    state.loading = false;
                    state.items = [];

                    state.error =
                        action.payload ||
                        "Failed to load broadcasts";
                }
            )

            /*
            |--------------------------------------------------------------------------
            | Event Recipients
            |--------------------------------------------------------------------------
            */

            .addCase(
                fetchEventBroadcastRecipients.pending,
                (state) => {
                    state.recipientsLoading = true;
                    state.recipients = [];
                    state.error = null;
                }
            )

            .addCase(
                fetchEventBroadcastRecipients.fulfilled,
                (state, action) => {
                    state.recipientsLoading = false;

                    state.recipients =
                        Array.isArray(
                            action.payload?.data
                        )
                            ? action.payload.data
                            : Array.isArray(
                                action.payload
                            )
                                ? action.payload
                                : [];
                }
            )

            .addCase(
                fetchEventBroadcastRecipients.rejected,
                (state, action) => {
                    state.recipientsLoading = false;
                    state.recipients = [];

                    state.error =
                        action.payload ||
                        "Failed to load event recipients";
                }
            )

            /*
            |--------------------------------------------------------------------------
            | Form Recipients
            |--------------------------------------------------------------------------
            */

            .addCase(
                fetchFormBroadcastRecipients.pending,
                (state) => {
                    state.recipientsLoading = true;
                    state.recipients = [];
                    state.error = null;
                }
            )

            .addCase(
                fetchFormBroadcastRecipients.fulfilled,
                (state, action) => {
                    state.recipientsLoading = false;

                    state.recipients =
                        Array.isArray(
                            action.payload?.data
                        )
                            ? action.payload.data
                            : Array.isArray(
                                action.payload
                            )
                                ? action.payload
                                : [];
                }
            )

            .addCase(
                fetchFormBroadcastRecipients.rejected,
                (state, action) => {
                    state.recipientsLoading = false;
                    state.recipients = [];

                    state.error =
                        action.payload ||
                        "Failed to load form recipients";
                }
            )

            /*
            |--------------------------------------------------------------------------
            | Create Broadcast
            |--------------------------------------------------------------------------
            */

            .addCase(
                createBroadcast.pending,
                (state) => {
                    state.creating = true;
                    state.error = null;
                }
            )
            .addCase(
                createBroadcast.fulfilled,
                (state, action) => {
                    state.creating = false;

                    const broadcast =
                        action.payload;

                    if (broadcast) {
                        state.items.unshift(broadcast);
                    }
                }
            )

            .addCase(
                createBroadcast.rejected,
                (state, action) => {
                    state.creating = false;

                    state.error =
                        action.payload ||
                        "Failed to create broadcast";
                }
            )

            /*
            |--------------------------------------------------------------------------
            | Send Broadcast
            |--------------------------------------------------------------------------
            */

            .addCase(
                sendBroadcast.pending,
                (state) => {
                    state.error = null;
                }
            )

            .addCase(
                sendBroadcast.fulfilled,
                (state, action) => {
                    const payload =
                        action.payload;

                    const sentBroadcast =
                        payload?.data &&
                            !Array.isArray(
                                payload.data
                            )
                            ? payload.data
                            : null;

                    if (
                        sentBroadcast?.public_id
                    ) {
                        const index =
                            state.items.findIndex(
                                (item) =>
                                    item.public_id ===
                                    sentBroadcast.public_id
                            );

                        if (index !== -1) {
                            state.items[index] = {
                                ...state.items[
                                index
                                ],
                                ...sentBroadcast,
                            };
                        }
                    }
                }
            )

            .addCase(
                sendBroadcast.rejected,
                (state, action) => {
                    state.error =
                        action.payload ||
                        "Failed to send broadcast";
                }
            )

            .addCase(
                deleteBroadcast.fulfilled,
                (state, action) => {
                    state.items = state.items.filter(
                        (item) => item.public_id !== action.payload
                    );
                }
            );
    },
});

/*
|--------------------------------------------------------------------------
| Actions
|--------------------------------------------------------------------------
*/

export const {
    clearBroadcastRecipients,
    clearBroadcastError,
    clearBroadcasts,
} = broadcastSlice.actions;

/*
|--------------------------------------------------------------------------
| Reducer
|--------------------------------------------------------------------------
*/

export default broadcastSlice.reducer;
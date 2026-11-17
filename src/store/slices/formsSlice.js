import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import api from '../../services/api';

const readError = (error, fallback) => {
    const messages = error?.response?.data?.messages;

    if (messages) {
        // Publish returns { schema: [...errors] }; everything else is flat.
        const flat = Object.values(messages).flat();
        return flat.join(' ');
    }

    return error?.response?.data?.message || fallback;
};

export const fetchForms = createAsyncThunk(
    'forms/fetchAll',
    async (eventId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/events/${eventId}/forms`);
            return { eventId, forms: response.data || [] };
        } catch (error) {
            return rejectWithValue(readError(error, 'Failed to load registration forms'));
        }
    }
);

const loadFormsList = createAsyncThunk(
    'forms/fetchList',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get(`/events/forms/list`);
            return { forms: response.data || [] };
        } catch (error) {
            return rejectWithValue(readError(error, 'Failed to load registration forms'));
        }
    }
);

/** How long a loaded list is reused before a page visit asks the server again. */
const FORMS_LIST_FRESH_MS = 5 * 60 * 1000;

/**
 * Successful actions that change what the forms list shows — a form added,
 * renamed, published, switched off or restored, or an event renamed or
 * removed. Matched by type so this slice need not import the events slice.
 */
const FORMS_LIST_CHANGES = new Set([
    'forms/create/fulfilled',
    'forms/duplicate/fulfilled',
    'forms/update/fulfilled',
    'forms/publish/fulfilled',
    'forms/delete/fulfilled',
    'forms/restore/fulfilled',
    'forms/purge/fulfilled',
    'events/update/fulfilled',
    'events/delete/fulfilled',
]);

// The request in flight, so pages mounting together share one call.
let formsListRequest = null;

/**
 * The account's forms, from the store when they were loaded recently.
 *
 * Coming back to a page reuses what is already loaded instead of asking
 * again. A change made in this tab (create, duplicate, delete, rename,
 * publish) marks the list stale, so the next visit reloads it; `force`
 * reloads now, for a refresh button. Switching account or signing out
 * reloads the page, which empties the store, so a list never outlives its
 * account.
 *
 * Resolves with the forms; rejects with the error message.
 */
export const fetchFormsList = ({ force = false } = {}) => (dispatch, getState) => {
    const { allForms, allFormsFetchedAt } = getState().forms;

    if (!force && allFormsFetchedAt && Date.now() - allFormsFetchedAt < FORMS_LIST_FRESH_MS) {
        return Promise.resolve(allForms);
    }

    if (formsListRequest) return formsListRequest;

    formsListRequest = dispatch(loadFormsList())
        .unwrap()
        .then((payload) => payload.forms)
        .finally(() => {
            formsListRequest = null;
        });

    return formsListRequest;
};

/**
 * Creates a form, with or without an event.
 *
 * Without an eventId it posts to the standalone endpoint — a job application
 * or a feedback round has no venue and no date, and making one up put a fake
 * event on the organiser's events list for ever.
 */
export const createForm = createAsyncThunk(
    'forms/create',
    async ({ eventId, ...payload }, { rejectWithValue }) => {
        try {
            const response = await api.post(eventId ? `/events/${eventId}/forms` : '/forms', payload);
            return response.data;
        } catch (error) {
            return rejectWithValue(readError(error, 'Failed to create the form'));
        }
    }
);

export const fetchForm = createAsyncThunk(
    'forms/fetchOne',
    async (formId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/forms/${formId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(readError(error, 'Failed to load the form'));
        }
    }
);

export const updateForm = createAsyncThunk(
    'forms/update',
    async ({ formId, ...payload }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/forms/${formId}`, payload);
            return response.data;
        } catch (error) {
            return rejectWithValue(readError(error, 'Failed to update the form'));
        }
    }
);

/**
 * A banner or logo of the form's own.
 *
 * Multipart, like the event's own images. `files` is { banner?: File, logo?: File };
 * whichever is present is uploaded and replaces what was there.
 */
export const uploadFormImages = createAsyncThunk(
    'forms/uploadImages',
    async ({ formId, files }, { rejectWithValue }) => {
        const body = new FormData();

        Object.entries(files).forEach(([field, file]) => {
            if (file) body.append(field, file);
        });

        try {
            const response = await api.post(`/forms/${formId}/images`, body);
            return { formId, ...response };
        } catch (error) {
            return rejectWithValue(readError(error, 'Could not upload the image'));
        }
    }
);

/** Drops the form's own banner or logo, putting the event's back. */
export const removeFormImage = createAsyncThunk(
    'forms/removeImage',
    async ({ formId, which }, { rejectWithValue }) => {
        try {
            const response = await api.delete(`/forms/${formId}/images/${which}`);
            return { formId, ...response };
        } catch (error) {
            return rejectWithValue(readError(error, 'Could not remove the image'));
        }
    }
);

/** Replaces the whole canvas — sections, fields, options and rules. */
export const saveStructure = createAsyncThunk(
    'forms/saveStructure',
    async ({ formId, schema }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/forms/${formId}/structure`, schema);
            return response.data;
        } catch (error) {
            return rejectWithValue(readError(error, 'Failed to save the form structure'));
        }
    }
);

export const publishForm = createAsyncThunk(
    'forms/publish',
    async (formId, { rejectWithValue }) => {
        try {
            const response = await api.post(`/forms/${formId}/publish`, {});
            return response.data;
        } catch (error) {
            return rejectWithValue(readError(error, 'Failed to publish the form'));
        }
    }
);

/**
 * Copies a form. Takes `{ formId, name, free, publish }`, or a bare id for the
 * plain "(copy)" behaviour older callers relied on.
 */
export const duplicateForm = createAsyncThunk(
    'forms/duplicate',
    async (arg, { rejectWithValue }) => {
        const { formId, ...options } = typeof arg === 'object' && arg !== null ? arg : { formId: arg };

        try {
            const response = await api.post(`/forms/${formId}/duplicate`, options);
            return response.data;
        } catch (error) {
            return rejectWithValue(readError(error, 'Failed to duplicate the form'));
        }
    }
);

/**
 * Resetting a form's data.
 *
 * Hides every registration on the form. Nothing is deleted: the rows stay in
 * the database with their ids, answers and payments, and restoreSubmissions
 * brings them back. `confirm` is required by the API so a stray request cannot
 * clear a form.
 */
export const resetSubmissions = createAsyncThunk(
    'forms/resetSubmissions',
    async ({ formId }, { rejectWithValue }) => {
        try {
            // Sent twice on purpose: some proxies drop a body on DELETE, and
            // losing the confirmation would turn this into a refusal.
            const response = await api.delete(`/forms/${formId}/submissions?confirm=1`, {
                data: { confirm: true },
            });
            return { formId, ...response };
        } catch (error) {
            return rejectWithValue(readError(error, 'Failed to reset the form data'));
        }
    }
);

/** Hides one registration, keeping the record. */
export const hideSubmission = createAsyncThunk(
    'forms/hideSubmission',
    async ({ formId, submissionId }, { rejectWithValue }) => {
        try {
            const response = await api.delete(`/forms/${formId}/submissions/${submissionId}`);
            return { formId, submissionId, ...response };
        } catch (error) {
            return rejectWithValue(readError(error, 'Failed to remove the registration'));
        }
    }
);

/** What is currently hidden on a form, grouped by when it was hidden. */
export const fetchHiddenSubmissions = createAsyncThunk(
    'forms/fetchHiddenSubmissions',
    async ({ formId }, { rejectWithValue }) => {
        try {
            const response = await api.get(`/forms/${formId}/submissions/hidden`);
            return { formId, ...response.data };
        } catch (error) {
            return rejectWithValue(readError(error, 'Failed to read the hidden registrations'));
        }
    }
);

/**
 * Records a decision on one submission — approved, rejected, or back to
 * pending when the wrong row was clicked.
 */
export const reviewSubmission = createAsyncThunk(
    'forms/reviewSubmission',
    async ({ formId, submissionId, decision, note }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/forms/${formId}/submissions/${submissionId}/review`, {
                decision,
                note,
            });

            return { formId, submissionId, ...response };
        } catch (error) {
            return rejectWithValue(readError(error, 'Could not record that decision'));
        }
    }
);

/** The same decision on several at once — what a shortlisting pass looks like. */
export const reviewSubmissions = createAsyncThunk(
    'forms/reviewSubmissions',
    async ({ formId, ids, decision, note }, { rejectWithValue }) => {
        try {
            const response = await api.post(`/forms/${formId}/submissions/review`, { ids, decision, note });

            return { formId, ...response };
        } catch (error) {
            return rejectWithValue(readError(error, 'Could not record those decisions'));
        }
    }
);

/** Brings hidden registrations back — all of them, or one batch. */
export const restoreSubmissions = createAsyncThunk(
    'forms/restoreSubmissions',
    async ({ formId, hiddenAt = null }, { rejectWithValue }) => {
        try {
            const response = await api.post(`/forms/${formId}/submissions/restore`, { hiddenAt });
            return { formId, ...response };
        } catch (error) {
            return rejectWithValue(readError(error, 'Failed to restore the registrations'));
        }
    }
);

/**
 * Deleting a form.
 *
 * Only a form with no active registrations is deleted — it moves to Deleted
 * forms and leaves every list. One that still has live registrations is just
 * switched off, so `deleted` tells the two apart and the list only drops a form
 * that is really gone.
 */
export const deleteForm = createAsyncThunk(
    'forms/delete',
    async (formId, { rejectWithValue }) => {
        try {
            const response = await api.delete(`/forms/${formId}`);
            return {
                formId,
                message: response.message,
                deleted: response.data?.deleted !== false,
            };
        } catch (error) {
            return rejectWithValue(readError(error, 'Failed to delete the form'));
        }
    }
);

// ---------------------------------------------------------- deleted forms

export const fetchTrash = createAsyncThunk(
    'forms/fetchTrash',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/forms/trash');
            return { forms: response.data || [], canPurge: response.canPurge === true };
        } catch (error) {
            return rejectWithValue(readError(error, 'Could not load the deleted forms'));
        }
    }
);

export const restoreForm = createAsyncThunk(
    'forms/restore',
    async (formId, { rejectWithValue }) => {
        try {
            const response = await api.post(`/forms/${formId}/restore`);
            return { formId, message: response.message };
        } catch (error) {
            return rejectWithValue(readError(error, 'Could not restore the form'));
        }
    }
);

/** Emails the owner the code that unlocks a permanent delete. */
export const sendPurgeCode = createAsyncThunk(
    'forms/sendPurgeCode',
    async (formId, { rejectWithValue }) => {
        try {
            const response = await api.post(`/forms/${formId}/purge/code`);
            return { message: response.message };
        } catch (error) {
            return rejectWithValue(readError(error, 'Could not send the code'));
        }
    }
);

/** Erases a deleted form and everything on it. Needs the emailed code. */
export const purgeForm = createAsyncThunk(
    'forms/purge',
    async ({ formId, code }, { rejectWithValue }) => {
        try {
            const response = await api.delete(`/forms/${formId}/purge`, { data: { code } });
            return { formId, message: response.message };
        } catch (error) {
            return rejectWithValue(readError(error, 'Could not delete the form'));
        }
    }
);

/**
 * One page of submissions. Search, filters, sorting and paging are all resolved
 * server-side so the table stays honest on forms with thousands of entries.
 */
export const fetchSubmissions = createAsyncThunk(
    'forms/submissions',
    async ({ formId, query = {} }, { rejectWithValue }) => {
        try {
            const { parameters = {}, ...rest } = query;

            const params = Object.fromEntries(
                Object.entries(rest).filter(([, value]) => value !== '' && value != null)
            );

            // Discovered filters go over the wire as parameters[field:gender]=male,
            // which PHP reads back as an array without a fixed list of names.
            Object.entries(parameters).forEach(([key, value]) => {
                if (value !== '' && value != null) params[`parameters[${key}]`] = value;
            });

            const response = await api.get(`/forms/${formId}/submissions`, { params });

            return {
                formId,
                submissions: response.data || [],
                meta: response.meta || null,
                filters: response.filters || null,
                context: response.context || null,
                review: response.review || null,
            };
        } catch (error) {
            return rejectWithValue(readError(error, 'Failed to load submissions'));
        }
    }
);

/**
 * Records what the scale said for one registration. The server replies with the
 * saved weight and time, which replaces them on the row — no refetch of the list.
 */
export const recordWeighIn = createAsyncThunk(
    'forms/weighIn',
    async ({ formId, submissionId, weight, categoryEntries }, { rejectWithValue }) => {
        try {
            const payload = { weight };
            if (categoryEntries !== undefined) payload.categoryEntries = categoryEntries;
            const response = await api.put(`/forms/${formId}/submissions/${submissionId}/weigh-in`, payload);
            return {
                formId,
                submissionId,
                weighIn: response.data.weighIn,
                entries: response.data.entries,
                message: response.message,
            };
        } catch (error) {
            return rejectWithValue(readError(error, 'Could not save the weight'));
        }
    }
);

const initialState = {
    // Form lists keyed by event id.
    byEvent: {},
    allForms: [], // The flat list of all forms for the user.
    // When allForms was last loaded; null when never, or marked stale by a change.
    allFormsFetchedAt: null,
    listStatus: 'idle',

    // The form currently open in the builder.
    current: null,
    currentSchema: null,
    currentValidation: null,
    // Options for dataset-backed fields, resolved for this event. Used by the
    // preview so it matches what a participant is actually offered.
    currentDatasets: {},
    // The event this form belongs to. Its status decides whether the public
    // link works, so the builder can explain a form nobody can reach.
    currentEvent: null,
    // Hidden registrations per form: { total, batches[] }. What a restore offers.
    hiddenSubmissions: {},
    // Review per form: { enabled, labels, counts }. Absent until a page loads.
    review: {},
    gateway: { configured: false, webhook: false },
    currentStatus: 'idle',

    // Submissions keyed by form id: the current page plus its paging metadata
    // and the filter choices the server says are worth offering.
    submissions: {},
    submissionsMeta: {},
    submissionsFilters: {},
    // Which form and event the submissions belong to, so a page showing nothing
    // but this data can title itself without a second request.
    submissionsContext: {},
    submissionsStatus: 'idle',
    saveStatus: 'idle',
    error: null,

    // Unsaved builder edits.
    isDirty: false,
};

const formsSlice = createSlice({
    name: 'forms',
    initialState,
    reducers: {
        /** Local canvas edit; nothing hits the network until saveStructure. */
        setSchema(state, action) {
            state.currentSchema = action.payload;
            state.isDirty = true;
        },
        clearCurrent(state) {
            state.current = null;
            state.currentSchema = null;
            state.currentValidation = null;
            state.currentDatasets = {};
            state.currentEvent = null;
            state.currentStatus = 'idle';
            state.isDirty = false;
        },
        setFormStatus(state, action) {
            const { id, status } = action.payload;
            const form = state.allForms.find((f) => String(f.id) === String(id));
            if (form) form.status = status;
            
            if (state.current && String(state.current.id) === String(id)) {
                state.current.status = status;
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchForms.pending, (state) => {
                state.listStatus = 'loading';
            })
            .addCase(fetchForms.fulfilled, (state, action) => {
                state.listStatus = 'succeeded';
                state.byEvent[action.payload.eventId] = action.payload.forms;
            })
            .addCase(fetchForms.rejected, (state, action) => {
                state.listStatus = 'failed';
                state.error = action.payload;
            })

            .addCase(loadFormsList.pending, (state) => {
                // A reload of a list already on screen keeps showing it.
                if (!state.allFormsFetchedAt) state.listStatus = 'loading';
            })
            .addCase(loadFormsList.fulfilled, (state, action) => {
                state.listStatus = 'succeeded';
                state.allForms = action.payload.forms;
                state.allFormsFetchedAt = Date.now();
            })
            .addCase(loadFormsList.rejected, (state, action) => {
                state.listStatus = 'failed';
                state.error = action.payload;
            })

            .addCase(createForm.fulfilled, (state, action) => {
                const form = action.payload;
                const list = state.byEvent[form.event_id] || [];
                state.byEvent[form.event_id] = [{ ...form, submission_count: 0 }, ...list];
            })
            .addCase(duplicateForm.fulfilled, (state, action) => {
                const form = action.payload;
                const list = state.byEvent[form.event_id] || [];
                state.byEvent[form.event_id] = [{ ...form, submission_count: 0 }, ...list];
            })

            .addCase(uploadFormImages.fulfilled, (state, action) => {
                if (state.current) state.current.images = action.payload.data?.images ?? null;
            })
            .addCase(removeFormImage.fulfilled, (state, action) => {
                if (state.current) state.current.images = action.payload.data?.images ?? null;
            })

            .addCase(reviewSubmission.fulfilled, (state, action) => {
                const counts = action.payload.data?.counts;

                if (counts && state.review[action.payload.formId]) {
                    state.review[action.payload.formId].counts = counts;
                }
            })
            .addCase(reviewSubmissions.fulfilled, (state, action) => {
                const counts = action.payload.data?.counts;

                if (counts && state.review[action.payload.formId]) {
                    state.review[action.payload.formId].counts = counts;
                }
            })

            .addCase(fetchHiddenSubmissions.fulfilled, (state, action) => {
                state.hiddenSubmissions[action.payload.formId] = {
                    total: action.payload.total ?? 0,
                    batches: action.payload.batches ?? [],
                };
            })
            .addCase(resetSubmissions.fulfilled, (state, action) => {
                state.hiddenSubmissions[action.payload.formId] = action.payload.data?.summary ?? null;
            })

            .addCase(fetchForm.pending, (state) => {
                state.currentStatus = 'loading';
            })
            .addCase(fetchForm.fulfilled, (state, action) => {
                state.currentStatus = 'succeeded';
                state.current = action.payload.form;
                state.currentSchema = action.payload.schema;
                state.currentValidation = action.payload.validation;
                state.currentDatasets = action.payload.datasets || {};
                state.currentEvent = action.payload.event || null;
                // Whether this server can take money, so the Fees tab can
                // explain itself rather than failing on save.
                state.gateway = action.payload.gateway || { configured: false, webhook: false };
                state.isDirty = false;
            })
            .addCase(fetchForm.rejected, (state, action) => {
                state.currentStatus = 'failed';
                state.error = action.payload;
            })

            .addCase(updateForm.fulfilled, (state, action) => {
                state.current = { ...state.current, ...action.payload };
            })

            .addCase(saveStructure.pending, (state) => {
                state.saveStatus = 'saving';
            })
            .addCase(saveStructure.fulfilled, (state, action) => {
                state.saveStatus = 'succeeded';
                state.currentSchema = action.payload.schema;
                state.currentValidation = action.payload.validation;
                state.isDirty = false;
            })
            .addCase(saveStructure.rejected, (state, action) => {
                state.saveStatus = 'failed';
                state.error = action.payload;
            })

            .addCase(publishForm.fulfilled, (state, action) => {
                if (state.current) {
                    state.current.status = 'published';
                    state.current.published_version_id = action.payload.versionId;
                }
            })

            .addCase(deleteForm.fulfilled, (state, action) => {
                // A form that was only switched off stays on the list.
                if (!action.payload.deleted) return;

                Object.keys(state.byEvent).forEach((eventId) => {
                    state.byEvent[eventId] = state.byEvent[eventId].filter(
                        (form) => String(form.id) !== String(action.payload.formId)
                    );
                });
                state.allForms = state.allForms.filter(
                    (form) => String(form.id) !== String(action.payload.formId)
                );
            })

            .addCase(fetchSubmissions.pending, (state) => {
                state.submissionsStatus = 'loading';
            })

            .addCase(fetchSubmissions.fulfilled, (state, action) => {
                const { formId, submissions, meta, filters, context } = action.payload;

                state.submissions[formId] = submissions;
                state.submissionsStatus = 'succeeded';

                if (meta) state.submissionsMeta[formId] = meta;
                // Filter choices only change when submissions do, so the last
                // set the server sent stays usable while a page is loading.
                if (filters) state.submissionsFilters[formId] = filters;
                if (context) state.submissionsContext[formId] = context;
                // Whether this form asks for a decision, what the states are
                // called on it, and how many are in each.
                if (action.payload.review) state.review[formId] = action.payload.review;
            })

            .addCase(recordWeighIn.fulfilled, (state, action) => {
                const { formId, submissionId, weighIn, entries } = action.payload;
                const row = (state.submissions[formId] ?? []).find((s) => s.id === submissionId);

                if (row) {
                    // First weighing of this player moves the "weighed so far" count.
                    if (row.weighIn?.kg == null && state.submissionsMeta[formId]?.weighed != null) {
                        state.submissionsMeta[formId].weighed += 1;
                    }

                    row.weighIn = weighIn;
                    if (entries) row.entries = entries;
                }
            })

            .addCase(fetchSubmissions.rejected, (state, action) => {
                state.submissionsStatus = 'failed';
                state.error = action.payload;
            })

            // A change to what the forms list shows: the next visit reloads it
            // instead of reusing the stored copy. (A deleted form is removed
            // from the stored list by its own case, so the list stays good.)
            .addMatcher(
                (action) =>
                    FORMS_LIST_CHANGES.has(action.type) &&
                    !(action.type === 'forms/delete/fulfilled' && action.payload?.deleted),
                (state) => {
                    state.allFormsFetchedAt = null;
                }
            );
    },
});

export const { setSchema, clearCurrent, setFormStatus } = formsSlice.actions;

export const selectFormsForEvent = (eventId) => (state) => state.forms.byEvent[eventId] ?? [];
export const selectAllForms = (state) => state.forms.allForms ?? [];

export const makeSelectFilteredForms = () => 
    createSelector(
        [selectAllForms, (state, searchQuery) => searchQuery],
        (forms, searchQuery) => {
            if (!searchQuery) return forms;
            const query = searchQuery.toLowerCase();
            return forms.filter(
                (form) =>
                    form.name?.toLowerCase().includes(query) ||
                    form.registration_type?.toLowerCase().includes(query) ||
                    form.status?.toLowerCase().includes(query)
            );
        }
    );
export const selectFormsStatus = (state) => state.forms.listStatus;
export const selectGateway = (state) => state.forms.gateway;
export const selectCurrentForm = (state) => state.forms.current;
export const selectCurrentSchema = (state) => state.forms.currentSchema;
export const selectCurrentValidation = (state) => state.forms.currentValidation;
export const selectCurrentDatasets = (state) => state.forms.currentDatasets;
export const selectCurrentEvent = (state) => state.forms.currentEvent;
export const selectHiddenSubmissionsFor = (formId) => (state) =>
    state.forms.hiddenSubmissions[formId] ?? null;
export const selectReviewFor = (formId) => (state) => state.forms.review[formId] ?? null;
export const selectFormStatus = (state) => state.forms.currentStatus;
export const selectFormSaving = (state) => state.forms.saveStatus === 'saving';
export const selectFormDirty = (state) => state.forms.isDirty;
export const selectSubmissionsFor = (formId) => (state) => state.forms.submissions[formId] ?? [];
export const selectSubmissionsMetaFor = (formId) => (state) => state.forms.submissionsMeta[formId] ?? null;
export const selectSubmissionsFiltersFor = (formId) => (state) => state.forms.submissionsFilters[formId] ?? null;
export const selectSubmissionsContextFor = (formId) => (state) => state.forms.submissionsContext[formId] ?? null;
export const selectSubmissionsLoading = (state) => state.forms.submissionsStatus === 'loading';

export default formsSlice.reducer;

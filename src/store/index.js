import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import eventsReducer from './slices/eventsSlice';
import eventTypesReducer from './slices/eventTypesSlice';
import settingsReducer from './slices/settingsSlice';
import formsReducer from './slices/formsSlice';
import dashboardReducer from './slices/dashboardSlice';
import payoutsReducer from './slices/payoutsSlice';
import broadcastReducer from "./slices/broadcastSlice";
import certificatesReducer from './slices/certificateSlice';
import notificationsReducer from './slices/notificationsSlice';
export const store = configureStore({
    reducer: {
        auth: authReducer,
        events: eventsReducer,
        eventTypes: eventTypesReducer,
        settings: settingsReducer,
        forms: formsReducer,
        dashboard: dashboardReducer,
        payouts: payoutsReducer,
        broadcast: broadcastReducer,
        certificates: certificatesReducer,
        notifications: notificationsReducer,

    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            // Event create/update carry File objects in the thunk argument,
            // which are not serialisable and never reach the store.
            serializableCheck: {
                ignoredActionPaths: ['meta.arg.logoFile', 'meta.arg.bannerFile', "broadcast/create/pending",
                    "broadcast/create/fulfilled",
                    "broadcast/create/rejected",],
            },
        }),
});

export default store;

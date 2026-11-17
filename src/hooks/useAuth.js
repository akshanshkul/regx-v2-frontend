import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    login as loginThunk,
    signup as signupThunk,
    googleLogin as googleLoginThunk,
    forgotPassword as forgotPasswordThunk,
    resetPassword as resetPasswordThunk,
    refreshUser as refreshUserThunk,
    clearAuth,
    selectUser,
    selectIsAuthenticated,
    selectAuthLoading,
} from '../store/slices/authSlice';

/**
 * Auth state and actions, backed by the Redux store.
 *
 * The shape returned here is unchanged from the old context implementation, so
 * every existing caller keeps working. Thunks are unwrapped, which means these
 * actions still reject with a real Error and existing try/catch blocks behave
 * exactly as before.
 */
export const useAuth = () => {
    const dispatch = useDispatch();

    const user = useSelector(selectUser);
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const loading = useSelector(selectAuthLoading);

    const actions = useMemo(
        () => ({
            login: (email, password) => dispatch(loginThunk({ email, password })).unwrap(),

            signup: (name, email, password, sports = []) =>
                dispatch(signupThunk({ name, email, password, sports })).unwrap(),

            googleLogin: (credentialResponse) =>
                dispatch(googleLoginThunk(credentialResponse)).unwrap(),

            forgotPassword: (email) => dispatch(forgotPasswordThunk(email)).unwrap(),

            resetPassword: (email, otp, new_password) =>
                dispatch(resetPasswordThunk({ email, otp, new_password })).unwrap(),

            // Kept non-throwing, matching the old implementation which only logged.
            refreshUser: () => dispatch(refreshUserThunk()).unwrap().catch(() => null),

            logout: () => {
                dispatch(clearAuth());
                window.location.href = '/login';
            },
        }),
        [dispatch]
    );

    return { user, isAuthenticated, loading, ...actions };
};

export default useAuth;

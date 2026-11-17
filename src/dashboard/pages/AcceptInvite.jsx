import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, Check, Loader2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { setAccountId } from '../../services/api';

/**
 * Joining someone else's account.
 *
 * The link carries the invitation; signing in is what proves who is accepting
 * it. An invitation is to an address, so it is refused for anyone signed in as
 * somebody else — which the server enforces too.
 */
const AcceptInvite = () => {
    const { token } = useParams();
    const navigate = useNavigate();

    const [state, setState] = useState({ loading: true, error: null, data: null });
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        document.title = 'Team invitation';

        api.get(`/invites/${token}`)
            .then((response) => setState({ loading: false, error: null, data: response.data }))
            .catch((error) =>
                setState({
                    loading: false,
                    error: error?.response?.data?.messages?.error || 'This invitation is no longer valid',
                    data: null,
                })
            );
    }, [token]);

    const accept = async () => {
        setJoining(true);

        try {
            const response = await api.post(`/invites/${token}/accept`);

            // Land them in the account they just joined.
            setAccountId(response.data?.accountId ?? null);
            toast.success(response.message);
            window.location.assign('/dashboard');
        } catch (error) {
            toast.error(error?.response?.data?.messages?.error || 'Could not accept the invitation');
            setJoining(false);
        }
    };

    if (state.loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
                <Loader2 className="w-7 h-7 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white border border-gray-200 rounded-3xl shadow-sm p-8 text-center">
                {state.error ? (
                    <>
                        <ShieldAlert className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                        <h1 className="text-xl font-bold text-gray-900">{state.error}</h1>
                        <p className="text-sm text-gray-500 mt-2">
                            Ask whoever invited you to send it again.
                        </p>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="mt-6 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Go to my dashboard
                        </button>
                    </>
                ) : (
                    <>
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-regx-orange grid place-items-center mx-auto mb-5">
                            <Building2 className="w-6 h-6" />
                        </div>

                        <h1 className="text-xl font-bold text-gray-900">
                            Join {state.data.account}
                        </h1>
                        <p className="text-sm text-gray-500 mt-2">
                            You have been invited as <strong className="text-gray-700">{state.data.role}</strong>.
                            Your own account stays yours — you can switch between the two whenever you like.
                        </p>

                        {state.data.matches ? (
                            <button
                                onClick={accept}
                                disabled={joining}
                                className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-regx-orange text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                            >
                                {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Accept invitation
                            </button>
                        ) : (
                            <div className="mt-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm text-left">
                                This invitation was sent to <strong>{state.data.invitedAs}</strong>. Sign out and sign in
                                with that address to accept it.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AcceptInvite;

import React, { useEffect, useState } from 'react';
import { X, Loader2, Banknote, BadgeX, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import DynamicForm from '../../shared/forms/DynamicForm';

/**
 * Edit any answer on one registration.
 *
 * It is the form the participant filled in — same fields, same rules — loaded
 * with their answers, so a correction is held to exactly what a submission is.
 * Category and fee are recomputed on the server when it is saved.
 */
const EditSubmissionModal = ({ formId, row, onClose, onSaved }) => {
    const [state, setState] = useState({ loading: true, error: null, data: null });
    const [saving, setSaving] = useState(false);
    const [serverErrors, setServerErrors] = useState({});
    const [settling, setSettling] = useState(null);

    // A fee that is still owed. Shown above the form, so it is reachable from
    // any step rather than only the last one.
    const owes = ['pending', 'failed', 'abandoned'].includes(row.payment_status) && Number(row.amount) > 0;

    // Asks Razorpay what happened. Paid there: the registration is settled.
    // Unpaid there: the attempt is marked failed.
    const checkWithRazorpay = async () => {
        setSettling('check');

        try {
            const response = await api.post(`/forms/${formId}/submissions/${row.id}/payment-check`);

            response.data?.changed ? toast.success(response.message) : toast(response.message);
            onSaved();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not check with Razorpay.');
        } finally {
            setSettling(null);
        }
    };

    const settle = async (kind) => {
        const amount = `₹${Number(row.amount).toLocaleString('en-IN')}`;
        const question =
            kind === 'cash'
                ? `Record ${amount} received in cash for ${row.reference}?`
                : `Waive the ${amount} fee for ${row.reference}? Nothing is collected and it is not counted as revenue.`;

        if (!window.confirm(question)) return;

        setSettling(kind);

        try {
            const response = await api.post(`/offline/submissions/${row.id}/${kind === 'cash' ? 'cash' : 'waive'}`);

            toast.success(response.message || 'Done.');
            onSaved();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Could not update the payment.');
        } finally {
            setSettling(null);
        }
    };

    useEffect(() => {
        api.get(`/forms/${formId}/submissions/${row.id}/edit`)
            .then((response) => setState({ loading: false, error: null, data: response.data }))
            .catch((error) =>
                setState({
                    loading: false,
                    error: error?.response?.data?.message || 'Could not load this registration.',
                    data: null,
                })
            );
    }, [formId, row.id]);

    // Files go through the form's own upload path, as they do for a participant.
    const handleUpload = async (field, file) => {
        const body = new FormData();

        body.append('field', field.key);
        body.append('file', file);

        try {
            const response = await api.post(`/form/${state.data.slug}/upload`, body);

            return response.data;
        } catch (error) {
            const payload = error.response?.data;

            throw (
                payload?.messages?.file ||
                payload?.messages?._form ||
                payload?.message ||
                'That file could not be uploaded.'
            );
        }
    };

    const handleSubmit = async (answers) => {
        setServerErrors({});
        setSaving(true);

        try {
            const response = await api.put(`/forms/${formId}/submissions/${row.id}`, { answers });

            toast.success(response.message || 'Registration updated.');
            onSaved();
        } catch (error) {
            const messages = error?.response?.data?.messages;

            if (messages && typeof messages === 'object' && !messages.error) {
                setServerErrors(messages);
                toast.error('Some answers need fixing');
            } else {
                toast.error(error?.response?.data?.message || 'Could not save the changes.');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm px-4 py-8">
            <div className="bg-gray-50 rounded-2xl w-full max-w-3xl shadow-2xl">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white rounded-t-2xl">
                    <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-lg">Edit details</h3>
                        <p className="text-xs text-gray-500 font-mono">{row.reference}</p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5">
                    {owes && (
                        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                            <p className="mr-auto text-sm text-amber-900">
                                <strong className="font-semibold">
                                    ₹{Number(row.amount).toLocaleString('en-IN')}
                                </strong>{' '}
                                fee is unpaid. Save any changes to the form first — the amount follows the answers.
                            </p>

                            <button
                                type="button"
                                disabled={settling !== null}
                                onClick={checkWithRazorpay}
                                title="Ask Razorpay if this was paid; if not, mark it failed"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                {settling === 'check' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                Check Razorpay
                            </button>

                            <button
                                type="button"
                                disabled={settling !== null}
                                onClick={() => settle('cash')}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                                {settling === 'cash' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                                Paid in cash
                            </button>

                            <button
                                type="button"
                                disabled={settling !== null}
                                onClick={() => settle('waive')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                            >
                                {settling === 'waive' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeX className="h-4 w-4" />}
                                Waive fee
                            </button>
                        </div>
                    )}

                    {state.loading && (
                        <div className="py-16 flex justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    )}

                    {state.error && <p className="py-10 text-center text-sm text-red-600">{state.error}</p>}

                    {state.data && (
                        <DynamicForm
                            schema={state.data.schema}
                            initialAnswers={state.data.answers}
                            serverErrors={serverErrors}
                            isSubmitting={saving}
                            onSubmit={handleSubmit}
                            onUpload={handleUpload}
                            submitLabel="Save changes"
                            saveAnyStep
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default EditSubmissionModal;

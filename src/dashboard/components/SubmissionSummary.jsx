import React, { useEffect, useState } from 'react';
import { BarChart3, Loader2, Inbox, MessageSquareText, Hash, CalendarDays } from 'lucide-react';
import api from '../../services/api';

/**
 * What a form's answers add up to.
 *
 * The submissions table answers "who said what". This answers the other
 * question — "what did people say" — which is the only one a survey is really
 * asking, and which no amount of scrolling a table gets you to.
 *
 * Each question is shown the way that question deserves: a choice as a
 * distribution, a number as a range, an open question as the answers
 * themselves. Nothing here is a chart library; a proportion reads perfectly
 * well as a bar and a percentage, and one fewer dependency on a page that
 * mostly shows numbers is worth having.
 */
const SubmissionSummary = ({ formId }) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let live = true;

        setData(null);
        setError(null);

        api.get(`/forms/${formId}/summary`)
            .then((response) => live && setData(response.data))
            .catch((e) => live && setError(e?.response?.data?.message || 'Could not build the summary.'));

        return () => {
            live = false;
        };
    }, [formId]);

    if (error) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
                <p className="text-sm text-red-600">{error}</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
        );
    }

    if (data.responses === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
                <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900">Nothing to summarise yet</h3>
                <p className="text-sm text-gray-500 mt-1">
                    Once people start answering, this is where the totals appear.
                </p>
            </div>
        );
    }

    if (data.fields.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
                <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900">No questions to total up</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                    This form asks for names, contact details and files — answers worth reading one
                    at a time rather than adding up. Choices, numbers, dates and open questions all
                    appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5 text-regx-orange" />
                </div>

                <div>
                    <p className="text-2xl font-bold text-gray-900 leading-none">
                        {data.responses.toLocaleString('en-IN')}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                        response{data.responses === 1 ? '' : 's'} summarised
                        {data.capped && ' — the first 5,000'}
                    </p>
                </div>
            </div>

            {data.fields.map((field) => (
                <Question key={field.key} field={field} />
            ))}
        </div>
    );
};

const Question = ({ field }) => (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
                <h3 className="font-semibold text-gray-900">{field.label}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                    {field.answered} answered
                    {field.skipped > 0 && ` · ${field.skipped} skipped`}
                    {field.multiple && ' · more than one allowed'}
                </p>
            </div>

            {field.average !== undefined && field.average !== null && (
                <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-gray-900 leading-none">{field.average}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">average</p>
                </div>
            )}
        </div>

        {field.kind === 'choice' && <Choices field={field} />}
        {field.kind === 'number' && <Numbers field={field} />}
        {field.kind === 'date' && <Dates field={field} />}
        {field.kind === 'open' && <Open field={field} />}
    </div>
);

/**
 * Every option, including the ones nobody picked — "nobody chose Saturday" is a
 * finding, and dropping it reads as though it was never offered.
 */
const Choices = ({ field }) => {
    const most = Math.max(1, ...field.options.map((o) => o.count));

    return (
        <div className="space-y-2.5">
            {field.options.map((option) => (
                <div key={option.value}>
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                        <span className={`text-sm truncate ${option.count === 0 ? 'text-gray-400' : 'text-gray-800'}`}>
                            {option.label}
                        </span>
                        <span className="text-xs text-gray-500 shrink-0 tabular-nums">
                            {option.count} · {option.percent}%
                        </span>
                    </div>

                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-regx-orange transition-all"
                            // Scaled against the most-picked option so the
                            // shape is readable even when nothing clears 20%.
                            style={{ width: `${(option.count / most) * 100}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

const Numbers = ({ field }) => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
            ['Lowest', field.min],
            ['Highest', field.max],
            ['Average', field.average],
            ['Middle', field.median],
        ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                <p className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {label}
                </p>
                <p className="text-lg font-semibold text-gray-900 mt-0.5 tabular-nums">
                    {value ?? '—'}
                </p>
            </div>
        ))}
    </div>
);

const Dates = ({ field }) => (
    <div className="grid grid-cols-2 gap-3">
        {[
            ['Earliest', field.earliest],
            ['Latest', field.latest],
        ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                <p className="text-[11px] text-gray-500 flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {label}
                </p>
                <p className="text-lg font-semibold text-gray-900 mt-0.5">{value ?? '—'}</p>
            </div>
        ))}
    </div>
);

const Open = ({ field }) => {
    const [all, setAll] = useState(false);
    const shown = all ? field.answers : field.answers.slice(0, 8);

    if (field.answers.length === 0) {
        return <p className="text-sm text-gray-400">Nobody answered this one.</p>;
    }

    return (
        <div className="space-y-2">
            {shown.map((answer, i) => (
                <p
                    key={i}
                    className="text-sm text-gray-700 bg-gray-50/70 border border-gray-100 rounded-lg px-3 py-2 whitespace-pre-line"
                >
                    <MessageSquareText className="w-3.5 h-3.5 text-gray-300 inline mr-1.5 -mt-0.5" />
                    {answer}
                </p>
            ))}

            {field.answers.length > 8 && (
                <button
                    type="button"
                    onClick={() => setAll(!all)}
                    className="text-xs font-medium text-regx-orange hover:underline"
                >
                    {all ? 'Show fewer' : `Show all ${field.answers.length}`}
                </button>
            )}

            {field.more > 0 && all && (
                <p className="text-[11px] text-gray-400">
                    {field.more} more not shown — export to read every one.
                </p>
            )}
        </div>
    );
};

export default SubmissionSummary;

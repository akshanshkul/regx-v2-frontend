import React, { useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import FieldRenderer from './FieldRenderer';
import CategoryEntries from './CategoryEntries';
import { evaluate, pruneAnswers } from './ruleEngine';

/**
 * Renders a published form schema, applying the rule engine on every change.
 *
 * Used by the public /form/:slug page and by the organiser's preview, so what
 * an organiser tests is literally the component a participant will use.
 */
const DynamicForm = ({ schema, initialAnswers = {}, serverErrors = {}, isSubmitting, onSubmit, onUpload, submitLabel, saveAnyStep = false }) => {
    const [answers, setAnswers] = useState(initialAnswers);
    const [touchedSubmit, setTouchedSubmit] = useState(false);
    const [step, setStep] = useState(0);

    const state = useMemo(() => evaluate(schema, answers), [schema, answers]);

    const steps = useMemo(() => {
        const list = (schema.sections || []).map((s) => s.step ?? 1);
        return [...new Set(list.length ? list : [1])].sort((a, b) => a - b);
    }, [schema]);

    const currentStep = steps[step] ?? 1;
    const isLastStep = step >= steps.length - 1;

    const handleChange = (key, value) => {
        setAnswers((prev) => {
            const next = { ...prev, [key]: value };
            // Re-run so a stale downstream answer (e.g. a Weight Category that
            // no longer applies after Gender changed) is dropped immediately.
            return pruneAnswers(schema, next, evaluate(schema, next));
        });
    };

    // Fields grouped under the section they belong to, in order.
    const sectionsForStep = useMemo(() => {
        const fields = [...(schema.fields || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        return (schema.sections || [])
            .filter((section) => (section.step ?? 1) === currentStep)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((section) => ({
                ...section,
                fields: fields.filter((f) => f.section === section.key),
            }))
            .filter((section) => state.sections[section.key] !== false)
            .filter((section) => section.fields.some((f) => state.visible[f.key] !== false));
    }, [schema, currentStep, state]);

    // Fields with no section at all still need somewhere to render.
    const looseFields = useMemo(
        () =>
            (schema.fields || [])
                .filter((f) => !f.section && state.visible[f.key] !== false)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        [schema, state]
    );

    /** Client-side required check for the current step only. */
    const stepErrors = useMemo(() => {
        const errors = {};

        sectionsForStep.forEach((section) => {
            section.fields.forEach((field) => {
                if (state.visible[field.key] === false) return;
                if (!state.required[field.key]) return;

                const value = state.values[field.key];
                const empty = value === undefined || value === null || value === '' ||
                    (Array.isArray(value) && value.length === 0) || value === false;

                if (empty) errors[field.key] = `${field.label} is required.`;
            });
        });

        return errors;
    }, [sectionsForStep, state]);

    const errors = { ...stepErrors, ...serverErrors };
    const showErrors = touchedSubmit;

    const handleNext = () => {
        setTouchedSubmit(true);
        if (Object.keys(stepErrors).length > 0) return;

        setTouchedSubmit(false);
        setStep((s) => Math.min(steps.length - 1, s + 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = (e) => {
        e?.preventDefault();
        setTouchedSubmit(true);

        if (Object.keys(stepErrors).length > 0 || state.blocked) return;

        const submission = { ...state.values };
        (schema.fields || []).forEach((field) => {
            if (field.type === 'code_block') delete submission[field.key];
        });
        onSubmit(submission, state);
    };

    /** Entries need the whole schema for their per-row cascades. */
    const renderField = (field) =>
        field.type === 'category_entries' ? (
            <CategoryEntries
                key={field.key}
                field={field}
                schema={schema}
                // A grid column can depend on an answer given outside the grid,
                // so it needs the whole set.
                answers={state.values}
                value={state.values[field.key]}
                onChange={handleChange}
                error={showErrors ? errors[field.key] : undefined}
            />
        ) : (
            <FieldRenderer
                key={field.key}
                field={field}
                value={state.values[field.key]}
                options={state.options[field.key] || []}
                // Location fields cascade off a sibling's answer, so they need
                // to see the whole set rather than just their own value.
                answers={state.values}
                schema={schema}
                disabled={state.disabled[field.key]}
                required={state.required[field.key]}
                error={showErrors ? errors[field.key] : undefined}
                onChange={handleChange}
                // Where a file field sends its file. Absent in the builder's
                // preview, which has no submission to attach anything to.
                onUpload={onUpload}
            />
        );

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step indicator */}
            {steps.length > 1 && (
                <div className="flex items-center gap-2">
                    {steps.map((s, i) => (
                        <React.Fragment key={s}>
                            <div
                                className={`rf-step ${i === step ? 'is-active' : i < step ? 'is-done' : ''} flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
                                    i === step
                                        ? 'bg-regx-orange text-white'
                                        : i < step
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-gray-100 text-gray-400'
                                }`}
                            >
                                {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                            </div>
                            {i < steps.length - 1 && <div className="flex-1 h-px bg-gray-200" />}
                        </React.Fragment>
                    ))}
                </div>
            )}

            {/* Rule messages */}
            {state.messages.map((message, i) => (
                <div
                    key={i}
                    className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                        state.blocked
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                >
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    {message.text}
                </div>
            ))}

            {looseFields.length > 0 && (
                <div className="rf-card bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                    {looseFields.map(renderField)}
                </div>
            )}

            {sectionsForStep.map((section) => (
                <div key={section.key} className="rf-card bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="rf-section-head border-b border-gray-100 pb-3 mb-5">
                        <h3 className="rf-section-title font-bold text-gray-900">{section.title}</h3>
                        {section.description && (
                            <p className="rf-section-desc text-sm text-gray-500 mt-0.5">{section.description}</p>
                        )}
                    </div>

                    <div className="space-y-5">
                        {section.fields
                            .filter((field) => state.visible[field.key] !== false)
                            .map(renderField)}
                    </div>
                </div>
            ))}

            {/* Live category / fee summary */}
            {(state.category || state.fee > 0) && (
                <div className="rf-summary bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-2">
                    {state.category && (
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-gray-500">Category</span>
                            <span className="text-sm font-semibold text-gray-900">{state.category}</span>
                        </div>
                    )}
                    {state.pricing && state.pricing.discount > 0 && (
                        <>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-sm text-gray-500">Subtotal</span>
                                <span className="text-sm text-gray-700">
                                    ₹ {state.pricing.subtotal.toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-sm text-green-700">Same-category discount</span>
                                <span className="text-sm font-medium text-green-700">
                                    − ₹ {state.pricing.discount.toLocaleString('en-IN')}
                                </span>
                            </div>
                        </>
                    )}

                    {state.fee > 0 && (
                        <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-200">
                            <span className="text-sm text-gray-500">Total payable</span>
                            <span className="rf-total text-lg font-bold text-gray-900">
                                ₹ {Number(state.fee).toLocaleString('en-IN')}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {showErrors && serverErrors._form && (
                <div className="flex items-start gap-2 p-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    {serverErrors._form}
                </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3">
                {step > 0 ? (
                    <button
                        type="button"
                        onClick={() => setStep((s) => s - 1)}
                        className="rf-back flex items-center gap-1.5 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                    </button>
                ) : (
                    <span />
                )}

                {saveAnyStep && !isLastStep && (
                    <button
                        key="save"
                        type="button"
                        onClick={() => handleSubmit()}
                        disabled={isSubmitting || state.blocked}
                        className="rf-save ml-auto px-5 py-2.5 border border-regx-orange text-regx-orange rounded-lg text-sm font-medium hover:bg-orange-50 transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving…' : submitLabel || 'Save'}
                    </button>
                )}

                {isLastStep ? (
                    <button
                        // A key, so React mounts a new button rather than flipping the
                        // Continue button's type to "submit" mid-click — which the
                        // browser then treats as that same click submitting the form.
                        key="submit"
                        type="submit"
                        disabled={isSubmitting || state.blocked}
                        className="rf-submit px-6 py-2.5 bg-regx-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? 'Submitting…' : submitLabel || 'Submit registration'}
                    </button>
                ) : (
                    <button
                        key="next"
                        type="button"
                        onClick={handleNext}
                        className="rf-next flex items-center gap-1.5 px-6 py-2.5 bg-regx-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                    >
                        Continue
                        <ChevronRight className="w-4 h-4" />
                    </button>
                )}
            </div>
        </form>
    );
};

export default DynamicForm;

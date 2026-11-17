import React from 'react';
import { IndianRupee, Tag, Info, Layers, CreditCard, Loader2, AlertTriangle } from 'lucide-react';

const control =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none';

/**
 * What a registration on this form costs.
 *
 * Pricing lives on the repeatable entry grid rather than on the form, because
 * that is where the thing being charged for is: a competitor entering three
 * categories pays for three, and a team paying one fee has one row. A form with
 * no grid has nothing to price, and says so instead of showing empty boxes.
 *
 * Everything here writes straight into the same field config the builder
 * already saves, so a price set from a template and a price set by hand are the
 * same data.
 */
const PricingSettings = ({ schema, onChange, form, gateway, onFormChange }) => {
    const grids = (schema.fields || []).filter((field) => field.type === 'category_entries');

    const update = (fieldKey, patch) =>
        onChange({
            ...schema,
            fields: schema.fields.map((field) =>
                field.key === fieldKey
                    ? { ...field, config: { ...(field.config || {}), ...patch } }
                    : field
            ),
        });

    const flatFee = Number(form?.settings?.pricing?.flatFee || 0);

    // A rule that sets the fee prices the form too, whatever the grid or the
    // flat fee say — so a form with one is not "charging nothing".
    const ruleSetsFee = (schema.rules || []).some(
        (rule) => rule.active !== false && (rule.actions || []).some((action) => action.action === 'set_fee')
    );

    // Only a form with nothing at all to price can be told it is free for sure.
    const unpriced = grids.length === 0 && flatFee <= 0 && !ruleSetsFee;

    const collection = (
        <PaymentCollection form={form} gateway={gateway} onChange={onFormChange} unpriced={unpriced} />
    );

    if (grids.length === 0) {
        return (
            <div className="space-y-4">
                {collection}

                <FlatFee value={flatFee} onSave={(fee) => onFormChange({ flatFee: fee })} />

                <p className="text-xs text-gray-500 px-1">
                    Charging per entry instead — a competitor pays for each category they enter? Add a{' '}
                    <strong>Category entries</strong> field on the Fields tab and its prices will appear
                    here in place of the flat fee.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {collection}

            {grids.map((grid) => (
                <GridPricing
                    key={grid.key}
                    grid={grid}
                    schema={schema}
                    onChange={(patch) => update(grid.key, patch)}
                    onSchemaChange={onChange}
                />
            ))}
        </div>
    );
};

/**
 * Names the answer a set of options belongs to.
 *
 * An option that only shows for one parent answer stores that answer's value —
 * and, when it hangs off several fields at once, those values joined with "|"
 * in the order the parents were declared. Resolve each part back to the label
 * the organiser typed, so the heading reads "Dance" rather than "dance", and
 * "Male · Junior" rather than "male|junior".
 */
const labelForParent = (parentValue, parentFields) => {
    if (!parentValue) return null;

    return String(parentValue)
        .split('|')
        .map((part, i) => {
            const match = (parentFields[i]?.options || []).find((option) => option.value === part);

            return match?.label || part;
        })
        .join(' · ');
};

const GridPricing = ({ grid, schema, onChange, onSchemaChange }) => {
    const config = grid.config || {};
    const columns = config.columns || [];

    const basePrice = Number(config.basePrice || 0);
    const discount = Number(config.discountPercent || 0);

    // A column whose options can carry their own price — an age band that costs
    // less than the senior one.
    const priceableColumns = columns.filter((column) => (column.type ?? 'select') === 'select');

    const priceColumn = priceableColumns.find((column) => column.key === config.priceFrom);
    const priceSource = priceColumn
        ? (schema.fields || []).find((field) => field.key === priceColumn.optionsFrom)
        : null;

    /**
     * The fields whose answers filter the price column's options — a Category
     * list that only offers dance categories once Dance is chosen.
     */
    const parentFields = React.useMemo(() => {
        const parent = priceSource?.optionsParentKey;
        const keys = Array.isArray(parent) ? parent : parent ? [parent] : [];

        return keys.map((key) => (schema.fields || []).find((field) => field.key === key) || null);
    }, [priceSource, schema]);

    /**
     * Every option of the price column, gathered under the answer it belongs to.
     *
     * Options that only appear for a particular parent answer used to be left
     * out of this list entirely, which hid the prices on any form where the
     * categories cascade — the common case, and the one where per-category
     * prices matter most. They are grouped instead, so a price set in the
     * database is a price the organiser can see and change.
     */
    const priceGroups = React.useMemo(() => {
        const options = priceSource?.options || [];
        const groups = [];
        const byKey = new Map();

        options.forEach((option, index) => {
            const key = option.parentValue ?? '';

            if (!byKey.has(key)) {
                const group = { key, label: labelForParent(option.parentValue, parentFields), options: [] };

                byKey.set(key, group);
                groups.push(group);
            }

            byKey.get(key).options.push({ ...option, index });
        });

        return groups;
    }, [priceSource, parentFields]);

    /**
     * A price for one category rides on that option's own meta, so it travels
     * with the option wherever it is used — including into the published
     * snapshot a registration is later priced against.
     */
    const setOverride = (at, price) => {
        const cleared = price === '' || price === null || Number.isNaN(Number(price));

        onSchemaChange({
            ...schema,
            fields: schema.fields.map((field) =>
                field.key !== priceSource.key
                    ? field
                    : {
                          ...field,
                          options: field.options.map((option, index) => {
                              if (index !== at) return option;

                              const meta = { ...(option.meta || {}) };

                              if (cleared) delete meta.price;
                              else meta.price = Number(price);

                              return { ...option, meta };
                          }),
                      }
            ),
        });
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4 text-regx-orange" />
                </div>

                <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900">{grid.label || grid.key}</h3>
                    <p className="text-xs text-gray-500">
                        Charged once per row a participant adds to this grid.
                    </p>
                </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price per entry (INR)</label>
                    <input
                        type="number"
                        min="0"
                        step="1"
                        value={config.basePrice ?? 0}
                        onChange={(e) => onChange({ basePrice: Number(e.target.value) })}
                        className={control}
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                        Set 0 for a free form, or for a grid that is not charged for.
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Repeat-category discount (%)
                    </label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={config.discountPercent ?? 0}
                        onChange={(e) => onChange({ discountPercent: Number(e.target.value) })}
                        className={control}
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                        Applied to every entry after the first that matches on the columns below.
                    </p>
                </div>
            </div>

            {/* What counts as the same category twice */}
            {columns.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-700 mb-1">Two entries count as a repeat when they share</p>
                    <p className="text-xs text-gray-500 mb-2">
                        Tick the columns that decide it. With age and weight ticked, the same class on the
                        other hand is a repeat and gets the discount — a different weight does not.
                    </p>

                    <div className="flex flex-wrap gap-2">
                        {columns.map((column) => {
                            const on = (config.matchOn || []).includes(column.key);

                            return (
                                <button
                                    key={column.key}
                                    type="button"
                                    onClick={() =>
                                        onChange({
                                            matchOn: on
                                                ? (config.matchOn || []).filter((k) => k !== column.key)
                                                : [...(config.matchOn || []), column.key],
                                        })
                                    }
                                    className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                                        on
                                            ? 'border-regx-orange bg-orange-50 text-regx-orange'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    {column.label || column.key}
                                </button>
                            );
                        })}
                    </div>

                    {(config.matchOn || []).length === 0 && discount > 0 && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2 inline-flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 shrink-0" />
                            With nothing ticked no entry is ever a repeat, so the discount never applies.
                        </p>
                    )}
                </div>
            )}

            {/* Per-category prices */}
            {priceableColumns.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-700 mb-1">Different price per category</p>
                    <p className="text-xs text-gray-500 mb-2">
                        Choose the column that decides the price, then set any that differ from the price above.
                    </p>

                    <select
                        value={config.priceFrom || ''}
                        onChange={(e) => onChange({ priceFrom: e.target.value || null })}
                        className={`${control} max-w-xs`}
                    >
                        <option value="">Every entry costs the same</option>
                        {priceableColumns.map((column) => (
                            <option key={column.key} value={column.key}>
                                Price depends on {column.label || column.key}
                            </option>
                        ))}
                    </select>

                    {priceSource && priceSource.optionsSource === 'dataset' && (
                        <p className="text-[11px] text-gray-500 mt-3">
                            This column takes its options from the event configuration, so there is no
                            fixed list to price here. Every entry is charged the price above.
                        </p>
                    )}

                    {priceSource && priceSource.optionsSource !== 'dataset' && priceGroups.length === 0 && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-3 inline-flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 shrink-0" />
                            “{priceSource.label || priceSource.key}” has no options yet — add them on the
                            Fields tab and their prices will appear here.
                        </p>
                    )}

                    {priceGroups.length > 0 && (
                        <div className="mt-3 space-y-3">
                            {priceGroups.map((group) => (
                                <div key={group.key || '__all'}>
                                    {group.label && (
                                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                            {group.label}
                                        </p>
                                    )}

                                    <div className="grid sm:grid-cols-2 gap-2">
                                        {group.options.map((option) => (
                                            <div key={`${group.key}:${option.value}`} className="flex items-center gap-2">
                                                <span
                                                    className="text-xs text-gray-600 w-32 shrink-0 truncate"
                                                    title={option.label}
                                                >
                                                    {option.label}
                                                </span>
                                                <div className="relative flex-1">
                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                                        ₹
                                                    </span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder={String(basePrice)}
                                                        value={option.meta?.price ?? ''}
                                                        onChange={(e) => setOverride(option.index, e.target.value)}
                                                        className={`${control} py-1.5 pl-6`}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            <p className="text-[11px] text-gray-400">
                                Leave a box empty to charge the price per entry above.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* What this actually adds up to */}
            <Example basePrice={basePrice} discount={discount} matchOn={config.matchOn || []} columns={columns} />
        </div>
    );
};

/**
 * A worked example from the settings as they stand, so an organiser can see
 * what they have configured rather than work it out.
 */
const Example = ({ basePrice, discount, matchOn, columns }) => {
    if (basePrice <= 0) return null;

    const repeat = Math.round(basePrice * (1 - discount / 100));
    const grouped = matchOn.length > 0 && discount > 0;

    const names = matchOn
        .map((key) => columns.find((c) => c.key === key)?.label || key)
        .join(' and ');

    return (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-start gap-2">
            <Tag className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />

            <p className="text-xs text-gray-600">
                {grouped ? (
                    <>
                        Three entries where two share the same {names}:{' '}
                        <span className="font-medium text-gray-900">
                            ₹{basePrice.toLocaleString('en-IN')} + ₹{repeat.toLocaleString('en-IN')} + ₹
                            {basePrice.toLocaleString('en-IN')} = ₹
                            {(basePrice * 2 + repeat).toLocaleString('en-IN')}
                        </span>
                    </>
                ) : (
                    <>
                        Three entries:{' '}
                        <span className="font-medium text-gray-900">
                            ₹{(basePrice * 3).toLocaleString('en-IN')}
                        </span>{' '}
                        — every entry at the same price.
                    </>
                )}
            </p>
        </div>
    );
};


/**
 * Whether money is actually collected, and how.
 *
 * Separate from the prices above, because they answer different questions: the
 * prices say what a registration costs, this says whether the participant is
 * asked to pay it now. A form can have prices and collect nothing — an event
 * taking cash at the gate — which is why the switch is its own decision.
 *
 * Online collection is only offered when the server has Razorpay keys. Without
 * them the switch says so, rather than saving a setting that would strand every
 * participant at a checkout that cannot open.
 */
/**
 * One fee for the whole registration, for a form with no entry grid to price.
 *
 * Saved with the form like the payment switch, not with the canvas, so it is
 * live as soon as it is saved — no publish step to forget.
 */
const FlatFee = ({ value, onSave }) => {
    const [draft, setDraft] = React.useState(value > 0 ? String(value) : '');

    React.useEffect(() => {
        setDraft(value > 0 ? String(value) : '');
    }, [value]);

    const commit = () => {
        const trimmed = draft.trim();
        const next = trimmed === '' ? 0 : Number(trimmed);

        if (!Number.isFinite(next) || next < 0) {
            setDraft(value > 0 ? String(value) : '');
            return;
        }

        if (next !== value) onSave(trimmed === '' ? '' : next);
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                    <IndianRupee className="w-4 h-4 text-gray-400" />
                </div>

                <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900">Registration fee</h3>
                    <p className="text-xs text-gray-500">
                        One fee for each registration on this form. Leave it empty to make the form free.
                    </p>
                </div>
            </div>

            <div className="mt-4 max-w-xs">
                <label htmlFor="flat-fee" className="block text-xs font-medium text-gray-600 mb-1">
                    Fee per registration
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
                    <input
                        id="flat-fee"
                        type="number"
                        min="0"
                        step="1"
                        inputMode="decimal"
                        value={draft}
                        placeholder="0"
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commit}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        className={`${control} pl-7`}
                    />
                </div>
            </div>
        </div>
    );
};

const PaymentCollection = ({ form, gateway, onChange, unpriced = false }) => {
    const [saving, setSaving] = React.useState(false);

    const online = form?.payment_mode === 'online';
    const ready = gateway?.configured ?? false;

    const set = async (patch) => {
        setSaving(true);

        try {
            await onChange(patch);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                </div>

                <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900">Collecting the fee</h3>
                    <p className="text-xs text-gray-500">
                        How a participant pays what the form charges.
                    </p>
                </div>

                {saving && <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0 mt-2" />}
            </div>

            <label
                className={`flex items-start gap-3 mt-4 p-3 rounded-xl border transition-colors ${
                    !ready
                        ? 'border-gray-100 bg-gray-50/60 cursor-not-allowed'
                        : online
                          ? 'border-regx-orange bg-orange-50/40 cursor-pointer'
                          : 'border-gray-200 cursor-pointer hover:border-gray-300'
                }`}
            >
                <input
                    type="checkbox"
                    checked={online}
                    disabled={!ready || saving}
                    onChange={(e) => set({ paymentMode: e.target.checked ? 'online' : 'none' })}
                    className="mt-0.5 w-4 h-4 rounded accent-regx-orange disabled:opacity-40"
                />

                <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">Accept payment online (Razorpay)</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                        The participant pays by card, UPI or netbanking as soon as they submit. A
                        registration is only marked paid once Razorpay confirms it.
                    </p>

                    {!ready && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2 inline-flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                            <span>
                                This server has no Razorpay keys yet, so online payment cannot be
                                switched on. Add <code className="font-mono">RAZORPAY_KEY_ID</code> and{' '}
                                <code className="font-mono">RAZORPAY_KEY_SECRET</code> to the backend
                                environment.
                            </span>
                        </p>
                    )}

                    {ready && online && unpriced && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2 inline-flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                            <span>
                                This form charges nothing yet, so no one will be asked to pay. Set a
                                registration fee below.
                            </span>
                        </p>
                    )}

                    {ready && online && !gateway?.webhook && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2 inline-flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                            <span>
                                No webhook secret is set. Payments will still work, but a participant
                                who closes the page mid-payment will not be marked paid automatically.
                            </span>
                        </p>
                    )}
                </div>
            </label>

            {online && (
                <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                        Checkout description
                    </label>
                    <input
                        defaultValue={form?.payment_description || ''}
                        placeholder={`Registration for ${form?.name ?? 'this event'}`}
                        onBlur={(e) => set({ paymentDescription: e.target.value })}
                        className={`${control} max-w-md`}
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                        Text shown on the payment window. The amount comes from the fee, not from here.
                    </p>
                </div>
            )}

            {!online && (
                <p className="text-xs text-gray-500 mt-3">
                    Nothing is collected through the form. The fee is still calculated and shown, and
                    every registration is recorded as unpaid for you to settle however you like.
                </p>
            )}
        </div>
    );
};

export default PricingSettings;

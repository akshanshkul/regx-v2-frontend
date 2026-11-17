/**
 * Browser copy of the backend rule engine.
 *
 * This exists purely so the form reacts instantly as someone types. It is NOT
 * a security boundary — App\Libraries\FormRuleEngine re-derives all of this on
 * submit and its answer is the one that counts. Keep the two in step: the
 * operator and action lists below mirror the PHP constants exactly.
 */

export const OPERATORS = [
    { key: 'equals', label: 'equals' },
    { key: 'not_equals', label: 'does not equal' },
    { key: 'contains', label: 'contains' },
    { key: 'not_contains', label: 'does not contain' },
    { key: 'greater_than', label: 'is greater than' },
    { key: 'less_than', label: 'is less than' },
    { key: 'greater_or_equal', label: 'is greater than or equal to' },
    { key: 'less_or_equal', label: 'is less than or equal to' },
    { key: 'is_empty', label: 'is empty' },
    { key: 'is_not_empty', label: 'is not empty' },
    { key: 'in_list', label: 'is one of' },
    { key: 'not_in_list', label: 'is not one of' },
];

export const ACTIONS = [
    { key: 'show_field', label: 'Show field', needsTarget: true },
    { key: 'hide_field', label: 'Hide field', needsTarget: true },
    { key: 'make_required', label: 'Make required', needsTarget: true },
    { key: 'make_optional', label: 'Make optional', needsTarget: true },
    { key: 'enable_field', label: 'Enable field', needsTarget: true },
    { key: 'disable_field', label: 'Disable field', needsTarget: true },
    { key: 'show_section', label: 'Show section', needsTarget: 'section' },
    { key: 'hide_section', label: 'Hide section', needsTarget: 'section' },
    { key: 'set_options', label: 'Set available options', needsTarget: true, needsValue: true },
    { key: 'set_default', label: 'Set default value', needsTarget: true, needsValue: true },
    { key: 'set_value', label: 'Set field value', needsTarget: true, needsValue: true },
    { key: 'calculate', label: 'Calculate value', needsTarget: true, needsValue: true },
    { key: 'set_category', label: 'Set category', needsTarget: true, needsValue: true },
    { key: 'set_fee', label: 'Set registration fee', needsTarget: true, needsValue: true },
    { key: 'show_message', label: 'Show a message', needsValue: true },
    { key: 'prevent_submission', label: 'Prevent submission', needsValue: true },
];

const MAX_PASSES = 10;

const toNumber = (value) => {
    if (Array.isArray(value)) return value.length;
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
};

const toList = (value) =>
    Array.isArray(value) ? value.map(String) : String(value ?? '').split(',').map((v) => v.trim());

/** Single condition. An unknown operator fails closed, matching the backend. */
export const compare = (left, operator, right) => {
    const isList = Array.isArray(left);
    const str = isList ? '' : String(left ?? '');

    switch (operator) {
        case 'equals':
            return isList ? left.map(String).includes(String(right)) : str === String(right);
        case 'not_equals':
            return !compare(left, 'equals', right);
        case 'contains':
            return isList ? left.map(String).includes(String(right)) : str.includes(String(right));
        case 'not_contains':
            return !compare(left, 'contains', right);
        case 'greater_than':
            return toNumber(left) > toNumber(right);
        case 'less_than':
            return toNumber(left) < toNumber(right);
        case 'greater_or_equal':
            return toNumber(left) >= toNumber(right);
        case 'less_or_equal':
            return toNumber(left) <= toNumber(right);
        case 'is_empty':
            return isList ? left.length === 0 : str === '';
        case 'is_not_empty':
            return !compare(left, 'is_empty', right);
        case 'in_list': {
            const list = toList(right);
            return isList
                ? left.map(String).some((v) => list.includes(v))
                : list.includes(str);
        }
        case 'not_in_list':
            return !compare(left, 'in_list', right);
        default:
            return false;
    }
};

/**
 * Options a field offers for the current answers.
 *
 * A dependent field reads whatever its parent currently holds, which is what
 * makes an arbitrarily deep chain work — each level only knows about the one
 * above it.
 */
/** How a composite parent value is spelled, matching the PHP engine. */
export const PARENT_SEPARATOR = '|';

/**
 * The joined value of several parent answers, in the order the field declares
 * them — "male|sub_jr". Null when any is still unanswered, since a half-known
 * dependency can offer nothing.
 */
export const compositeKey = (keys, answers) => {
    const parts = [];

    for (const key of keys) {
        const value = answers?.[key];

        if (value === undefined || value === null || value === '' || Array.isArray(value)) {
            return null;
        }

        parts.push(String(value));
    }

    return parts.join(PARENT_SEPARATOR);
};

export const optionsFor = (field, answers) => {
    const options = field.options || [];

    if ((field.optionsSource || 'static') !== 'dependent') {
        return options.filter((o) => o.active !== false);
    }

    const parentKey = field.optionsParentKey;
    if (!parentKey) return [];

    let parentValues;

    // A field can hang off more than one answer — a weight class depends on the
    // age band and on gender, since the women's classes are not the men's.
    // Several keys are matched as one joined value.
    if (Array.isArray(parentKey)) {
        const composite = compositeKey(parentKey, answers);
        if (composite === null) return [];

        parentValues = [composite];
    } else {
        const parentValue = answers[parentKey];
        if (parentValue === undefined || parentValue === null || parentValue === '') return [];

        parentValues = (Array.isArray(parentValue) ? parentValue : [parentValue]).map(String);
    }

    return options.filter((option) => {
        if (option.active === false) return false;
        // No parent value means the option applies to every parent.
        if (!option.parentValue) return true;
        return parentValues.includes(String(option.parentValue));
    });
};

const matches = (rule, values) => {
    const conditions = rule.conditions || [];
    if (conditions.length === 0) return false;

    const matchAny = (rule.matchType || 'all') === 'any';

    for (const condition of conditions) {
        const result = compare(values[condition.field], condition.operator || 'equals', condition.value);
        if (matchAny && result) return true;
        if (!matchAny && !result) return false;
    }

    return !matchAny;
};

/** Arithmetic over other fields, e.g. "{base} + {addon}". Digits only. */
const calculate = (expression, values) => {
    if (typeof expression !== 'string') return expression;

    const substituted = expression.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => String(toNumber(values[key] ?? 0)));

    if (!/^[0-9+\-*/(). ]+$/.test(substituted)) return 0;

    try {
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${substituted});`)();
        return Number.isFinite(result) ? result : 0;
    } catch {
        return 0;
    }
};

const applyAction = (state, action) => {
    const { action: type, target, value } = action;

    switch (type) {
        case 'show_field': if (target) state.visible[target] = true; break;
        case 'hide_field': if (target) state.visible[target] = false; break;
        case 'make_required': if (target) state.required[target] = true; break;
        case 'make_optional': if (target) state.required[target] = false; break;
        case 'enable_field': if (target) state.disabled[target] = false; break;
        case 'disable_field': if (target) state.disabled[target] = true; break;
        case 'show_section': if (target) state.sections[target] = true; break;
        case 'hide_section': if (target) state.sections[target] = false; break;

        case 'set_options':
            if (target && Array.isArray(value)) state.options[target] = value;
            break;

        case 'set_default':
            // Fills a blank only; never overwrites what someone typed.
            if (target && (state.values[target] ?? '') === '') state.values[target] = value;
            break;

        case 'set_value':
            if (target) state.values[target] = value;
            break;

        case 'calculate':
            if (target) state.values[target] = calculate(value, state.values);
            break;

        case 'set_category':
            state.category = value;
            if (target) state.values[target] = value;
            break;

        case 'set_fee':
            state.fee = toNumber(value);
            if (target) state.values[target] = state.fee;
            break;

        case 'show_message':
            state.messages.push({ target, text: String(value) });
            break;

        case 'prevent_submission':
            state.blocked = true;
            state.messages.push({ target, text: String(value || 'This combination cannot be submitted.') });
            break;

        default:
            break;
    }

    return state;
};

const signature = (state) =>
    JSON.stringify([
        state.visible, state.required, state.disabled,
        state.sections, state.values, state.category, state.fee, state.blocked,
    ]);

/**
 * Prices a category_entries field. Mirrors App\Libraries\FormPricingEngine.
 *
 * Entries matching on the configured keys are the same category entered more
 * than once, so every entry after the first in a group takes the discount.
 */
export const priceEntries = (schema, answers) => {
    // A disabled grid is not on the form, so it charges nothing.
    const entryFields = (schema.fields || []).filter((f) => f.type === 'category_entries' && isEnabled(f));
    if (entryFields.length === 0) return null;

    // A form can price more than one set of entries — an individual's own
    // categories and a team roster, say — so total across all of them.
    if (entryFields.length > 1) {
        const parts = entryFields.map((f) =>
            priceEntries({ ...schema, fields: schema.fields.filter((x) => x.type !== 'category_entries' || x.key === f.key) }, answers)
        );

        return {
            lines: parts.flatMap((p, i) => p.lines.map((l) => ({ ...l, field: entryFields[i].key }))),
            subtotal: Math.round(parts.reduce((t, p) => t + p.subtotal, 0) * 100) / 100,
            discount: Math.round(parts.reduce((t, p) => t + p.discount, 0) * 100) / 100,
            total: Math.round(parts.reduce((t, p) => t + p.total, 0) * 100) / 100,
        };
    }

    const field = entryFields[0];
    const config = field.config || {};
    const entries = answers[field.key];

    if (!Array.isArray(entries) || entries.length === 0) {
        return { lines: [], subtotal: 0, discount: 0, total: 0 };
    }

    const fieldsByKey = Object.fromEntries((schema.fields || []).map((f) => [f.key, f]));
    const basePrice = Number(config.basePrice || 0);
    const percent = Number(config.discountPercent || 0);
    const matchOn = config.matchOn || [];
    const columns = config.columns || [];

    const column = (key) => columns.find((c) => c.key === key) || {};

    const unitPrice = (entry) => {
        const priceFrom = config.priceFrom;
        if (!priceFrom || entry[priceFrom] === undefined) return basePrice;

        const source = column(priceFrom).optionsFrom;
        const option = (fieldsByKey[source]?.options || [])
            .find((o) => String(o.value) === String(entry[priceFrom]));

        const price = option?.meta?.price;
        return price === undefined || price === null ? basePrice : Number(price);
    };

    const labelFor = (entry) =>
        columns
            .map((c) => {
                const value = entry[c.key];
                if (value === undefined || value === '') return null;
                const option = (fieldsByKey[c.optionsFrom]?.options || [])
                    .find((o) => String(o.value) === String(value));
                return option ? option.label : value;
            })
            .filter(Boolean)
            .join(' / ');

    const seen = {};
    const lines = [];
    let subtotal = 0;
    let discount = 0;

    entries.forEach((entry, index) => {
        if (!entry || typeof entry !== 'object') return;

        const unit = unitPrice(entry);
        const key = matchOn.length
            ? matchOn.map((k) => String(entry[k] ?? '')).join('|')
            : JSON.stringify(entry);

        const repeat = seen[key] || 0;
        seen[key] = repeat + 1;

        const lineDiscount = repeat > 0 && percent > 0 ? Math.round(unit * (percent / 100) * 100) / 100 : 0;

        lines.push({
            index,
            entry,
            label: labelFor(entry),
            unitPrice: unit,
            isRepeat: repeat > 0,
            discountPct: repeat > 0 ? percent : 0,
            discount: lineDiscount,
            total: Math.round((unit - lineDiscount) * 100) / 100,
        });

        subtotal += unit;
        discount += lineDiscount;
    });

    return {
        lines,
        subtotal: Math.round(subtotal * 100) / 100,
        discount: Math.round(discount * 100) / 100,
        total: Math.round((subtotal - discount) * 100) / 100,
    };
};

/**
 * Whether a field is part of the form at all.
 *
 * Schemas published before fields could be disabled carry no flag, and every
 * field in them was on the form — so absent means enabled, and an old snapshot
 * renders exactly as it always did. Mirrors FormRuleEngine::isEnabled().
 */
export const isEnabled = (field) => field?.enabled !== false;

/**
 * Resolve the whole form state for a set of answers.
 * Mirrors FormRuleEngine::evaluate().
 */
export const evaluate = (schema, answers = {}) => {
    const fields = schema.fields || [];
    const sections = schema.sections || [];
    const codeBlockKeys = new Set(fields.filter((field) => field.type === 'code_block').map((field) => field.key));
    const ruleAnswers = Object.fromEntries(Object.entries(answers).filter(([key]) => !codeBlockKeys.has(key)));

    const build = () => {
        const state = {
            visible: {}, required: {}, disabled: {}, sections: {}, options: {},
            values: { ...ruleAnswers },
            category: null, fee: null, messages: [], blocked: false, appliedRules: [],
            assigned: [], pricing: null,
        };

        fields.forEach((field) => {
            state.visible[field.key] = !field.hidden && isEnabled(field);
            state.required[field.key] = !!field.required;
            state.disabled[field.key] = false;
            state.options[field.key] = optionsFor(field, ruleAnswers);
        });

        sections.forEach((section) => {
            state.sections[section.key] = true;
        });

        return state;
    };

    let state = build();

    // Settle single-option fields before any rule runs, so a rule testing
    // "participant_type equals team" still matches on a form where the sport
    // left team as the only possibility. Mirrors the backend.
    fields.forEach((field) => {
        if (!field.config?.autoSelectSingle) return;

        const options = state.options[field.key] || [];
        if (options.length !== 1) return;

        const current = state.values[field.key];
        if (current === undefined || current === null || current === '') {
            state.values[field.key] = options[0].value;
        }

        state.visible[field.key] = false;
        state.required[field.key] = false;
        state.assigned = [...(state.assigned || []), field.key];
    });

    for (let pass = 0; pass < MAX_PASSES; pass++) {
        const before = signature(state);

        const next = { ...state, messages: [], appliedRules: [...state.appliedRules] };

        (schema.rules || []).forEach((rule) => {
            if (rule.active === false) return;
            if (!matches(rule, next.values)) return;

            next.appliedRules.push(rule.id ?? rule.name ?? 'rule');
            (rule.actions || []).forEach((action) => applyAction(next, action));
        });

        // Re-derive dependent options against any values the rules assigned.
        fields.forEach((field) => {
            if ((field.optionsSource || 'static') === 'dependent') {
                next.options[field.key] = optionsFor(field, next.values);
            }
        });

        state = next;

        if (signature(state) === before) break;
    }

    // Multi-entry pricing, once the rules have settled. An explicit set_fee
    // still wins, matching the backend.
    const pricing = priceEntries(schema, state.values);
    if (pricing) {
        state.pricing = pricing;
        if (state.fee === null) state.fee = pricing.total;
    }

    // One flat fee for the registration, when nothing else priced it —
    // matching the backend.
    const flatFee = Number(schema.flatFee || 0);
    if (state.fee === null && flatFee > 0) state.fee = flatFee;

    // A field in a hidden section is off the form, and nothing hidden can be
    // required — otherwise the form could never be submitted.
    fields.forEach((field) => {
        if (field.section && state.sections[field.section] === false) {
            state.visible[field.key] = false;
        }
        // A disabled field is not part of the form, so no rule may show it —
        // unlike `hidden`, which is exactly what show_field is for.
        if (!isEnabled(field)) {
            state.visible[field.key] = false;
        }
        // Nor can a heading or a picture be required: they ask nothing.
        if (state.visible[field.key] === false || ['heading', 'display_image', 'code_block'].includes(field.type)) {
            state.required[field.key] = false;
        }
    });

    return state;
};

/**
 * Clears answers for fields that are no longer on the form, and for dependent
 * fields whose current value is no longer among the offered options — so
 * changing Gender cannot leave a stale Weight Category behind.
 */
export const pruneAnswers = (schema, answers, state) => {
    const pruned = { ...answers };

    (schema.fields || []).forEach((field) => {
        const key = field.key;

        if (field.type === 'code_block') {
            delete pruned[key];
            return;
        }

        if (state.visible[key] === false) {
            // Keep what the engine itself assigned; only user input is dropped.
            if (!(state.assigned || []).includes(key)) delete pruned[key];
            return;
        }

        if ((field.optionsSource || 'static') !== 'dependent') return;

        const current = pruned[key];
        if (current === undefined || current === '') return;

        const allowed = (state.options[key] || []).map((o) => String(o.value));
        const values = Array.isArray(current) ? current.map(String) : [String(current)];

        if (!values.every((v) => allowed.includes(v))) {
            delete pruned[key];
        }
    });

    return pruned;
};

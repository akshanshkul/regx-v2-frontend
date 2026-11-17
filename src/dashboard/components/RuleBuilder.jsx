import React from 'react';
import { Plus, Trash2, GitBranch } from 'lucide-react';
import { OPERATORS, ACTIONS } from '../../shared/forms/ruleEngine';

const input =
    'border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none';

// Operators that test presence, so there is nothing to compare against.
const VALUELESS = ['is_empty', 'is_not_empty'];

/**
 * Visual IF / THEN editor.
 *
 * Deliberately mirrors the engine one-for-one: the operator and action lists
 * come from the shared module, so the builder can only express rules the
 * backend will actually honour.
 */
const RuleBuilder = ({ schema, onChange }) => {
    const rules = schema.rules || [];
    const fields = schema.fields || [];
    const sections = schema.sections || [];

    const setRules = (next) => onChange({ ...schema, rules: next });

    const updateRule = (index, patch) =>
        setRules(rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));

    const addRule = () =>
        setRules([
            ...rules,
            {
                name: `Rule ${rules.length + 1}`,
                matchType: 'all',
                conditions: [{ field: fields[0]?.key ?? '', operator: 'equals', value: '' }],
                actions: [{ action: 'show_field', target: '', value: '' }],
                active: true,
            },
        ]);

    const removeRule = (index) => setRules(rules.filter((_, i) => i !== index));

    const optionsOf = (fieldKey) => fields.find((f) => f.key === fieldKey)?.options || [];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-gray-400" />
                        Conditional rules
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Run in order. Later rules can read values earlier ones set.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={addRule}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-regx-orange hover:text-regx-orange transition-colors shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    Add rule
                </button>
            </div>

            {rules.length === 0 && (
                <p className="text-sm text-gray-400 italic py-4">
                    No rules yet. Rules let a field appear, become required, or set a category and fee based on
                    what someone has already answered.
                </p>
            )}

            {rules.map((rule, ruleIndex) => {
                const conditions = rule.conditions || [];
                const actions = rule.actions || [];

                const setConditions = (next) => updateRule(ruleIndex, { conditions: next });
                const setActions = (next) => updateRule(ruleIndex, { actions: next });

                return (
                    <div
                        key={ruleIndex}
                        className={`border rounded-xl p-4 ${rule.active === false ? 'border-gray-200 bg-gray-50 opacity-70' : 'border-gray-200 bg-white'}`}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <input
                                className={`${input} flex-1 font-medium`}
                                value={rule.name || ''}
                                placeholder="Rule name"
                                onChange={(e) => updateRule(ruleIndex, { name: e.target.value })}
                            />

                            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer shrink-0">
                                <input
                                    type="checkbox"
                                    checked={rule.active !== false}
                                    onChange={(e) => updateRule(ruleIndex, { active: e.target.checked })}
                                    className="w-3.5 h-3.5 rounded text-regx-orange focus:ring-regx-orange/30"
                                />
                                Active
                            </label>

                            <button
                                type="button"
                                onClick={() => removeRule(ruleIndex)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* IF */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide w-10">If</span>
                                <select
                                    className={`${input} py-1 text-xs`}
                                    value={rule.matchType || 'all'}
                                    onChange={(e) => updateRule(ruleIndex, { matchType: e.target.value })}
                                >
                                    <option value="all">all of these match</option>
                                    <option value="any">any of these match</option>
                                </select>
                            </div>

                            {conditions.map((condition, i) => {
                                const fieldOptions = optionsOf(condition.field);
                                const needsValue = !VALUELESS.includes(condition.operator);

                                return (
                                    <div key={i} className="flex items-start gap-1.5 pl-10">
                                        <select
                                            className={`${input} flex-1 min-w-0`}
                                            value={condition.field || ''}
                                            onChange={(e) =>
                                                setConditions(conditions.map((c, j) => (j === i ? { ...c, field: e.target.value } : c)))
                                            }
                                        >
                                            <option value="">Choose a field…</option>
                                            {fields.map((f) => (
                                                <option key={f.key} value={f.key}>{f.label || f.key}</option>
                                            ))}
                                        </select>

                                        <select
                                            className={`${input} shrink-0`}
                                            value={condition.operator || 'equals'}
                                            onChange={(e) =>
                                                setConditions(conditions.map((c, j) => (j === i ? { ...c, operator: e.target.value } : c)))
                                            }
                                        >
                                            {OPERATORS.map((op) => (
                                                <option key={op.key} value={op.key}>{op.label}</option>
                                            ))}
                                        </select>

                                        {needsValue && (
                                            fieldOptions.length > 0 ? (
                                                <select
                                                    className={`${input} flex-1 min-w-0`}
                                                    value={condition.value ?? ''}
                                                    onChange={(e) =>
                                                        setConditions(conditions.map((c, j) => (j === i ? { ...c, value: e.target.value } : c)))
                                                    }
                                                >
                                                    <option value="">Choose a value…</option>
                                                    {fieldOptions.map((o) => (
                                                        <option key={o.value} value={o.value}>{o.label}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    className={`${input} flex-1 min-w-0`}
                                                    placeholder="value"
                                                    value={condition.value ?? ''}
                                                    onChange={(e) =>
                                                        setConditions(conditions.map((c, j) => (j === i ? { ...c, value: e.target.value } : c)))
                                                    }
                                                />
                                            )
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => setConditions(conditions.filter((_, j) => j !== i))}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 transition-colors shrink-0"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                );
                            })}

                            <button
                                type="button"
                                onClick={() => setConditions([...conditions, { field: '', operator: 'equals', value: '' }])}
                                className="ml-10 text-xs font-medium text-regx-orange hover:underline"
                            >
                                + condition
                            </button>
                        </div>

                        {/* THEN */}
                        <div className="space-y-2 mt-4 pt-3 border-t border-gray-100">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Then</span>

                            {actions.map((action, i) => {
                                const spec = ACTIONS.find((a) => a.key === action.action) || {};
                                const targetsSection = spec.needsTarget === 'section';

                                return (
                                    <div key={i} className="flex items-start gap-1.5 pl-10">
                                        <select
                                            className={`${input} flex-1 min-w-0`}
                                            value={action.action || ''}
                                            onChange={(e) =>
                                                setActions(actions.map((a, j) => (j === i ? { ...a, action: e.target.value } : a)))
                                            }
                                        >
                                            {ACTIONS.map((a) => (
                                                <option key={a.key} value={a.key}>{a.label}</option>
                                            ))}
                                        </select>

                                        {spec.needsTarget && (
                                            <select
                                                className={`${input} flex-1 min-w-0`}
                                                value={action.target || ''}
                                                onChange={(e) =>
                                                    setActions(actions.map((a, j) => (j === i ? { ...a, target: e.target.value } : a)))
                                                }
                                            >
                                                <option value="">Choose…</option>
                                                {(targetsSection ? sections : fields).map((t) => (
                                                    <option key={t.key} value={t.key}>{t.title || t.label || t.key}</option>
                                                ))}
                                            </select>
                                        )}

                                        {spec.needsValue && (
                                            <input
                                                className={`${input} flex-1 min-w-0`}
                                                placeholder="value"
                                                value={action.value ?? ''}
                                                onChange={(e) =>
                                                    setActions(actions.map((a, j) => (j === i ? { ...a, value: e.target.value } : a)))
                                                }
                                            />
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => setActions(actions.filter((_, j) => j !== i))}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 transition-colors shrink-0"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                );
                            })}

                            <button
                                type="button"
                                onClick={() => setActions([...actions, { action: 'show_field', target: '', value: '' }])}
                                className="ml-10 text-xs font-medium text-regx-orange hover:underline"
                            >
                                + action
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default RuleBuilder;

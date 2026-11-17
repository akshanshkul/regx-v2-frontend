import React, { useEffect } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';
import { optionsFor, priceEntries } from './ruleEngine';

const cell =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-regx-orange focus:border-regx-orange outline-none disabled:bg-gray-50 disabled:text-gray-400';

/**
 * Repeatable category grid: one row per category the participant is entering.
 *
 * Each row cascades independently — picking Junior in row 1 offers only Junior
 * weight classes in that row, while row 2 can be a Senior entry with its own
 * list. Pricing is shown live, including which rows are discounted repeats.
 */
const CategoryEntries = ({ field, schema, answers = {}, value, onChange, error }) => {
    const config = field.config || {};
    const columns = config.columns || [];
    const rows = Array.isArray(value) ? value : [];

    const maxEntries = Number(config.maxEntries || 0);
    const canAdd = maxEntries === 0 || rows.length < maxEntries;

    const fieldsByKey = Object.fromEntries((schema.fields || []).map((f) => [f.key, f]));

    /**
     * Options for one cell. A dependent column is filtered by this row's own
     * parent value, which is what keeps rows independent of each other.
     */
    const cellOptions = (column, row) => {
        const source = fieldsByKey[column.optionsFrom];
        if (!source) return [];

        // A column can depend on more than one answer — a weight class on the
        // age band picked in this row and on the gender given once for the whole
        // registration. Each key is read from the row first, then from the rest
        // of the form, so both live in one list.
        if (column.parentKeys) {
            return optionsFor(
                { ...source, optionsSource: 'dependent', optionsParentKey: column.parentKeys },
                { ...answers, ...row }
            );
        }

        if (!column.dependsOn) {
            return optionsFor({ ...source, optionsSource: 'static' }, {});
        }

        return optionsFor(
            { ...source, optionsSource: 'dependent', optionsParentKey: column.dependsOn },
            { [column.dependsOn]: row[column.dependsOn] }
        );
    };

    const updateCell = (rowIndex, columnKey, cellValue) => {
        const next = rows.map((row, i) => {
            if (i !== rowIndex) return row;

            const updated = { ...row, [columnKey]: cellValue };

            // Changing a parent invalidates whatever depended on it in this row.
            columns.forEach((column) => {
                if (column.dependsOn === columnKey) delete updated[column.key];
            });

            return updated;
        });

        onChange(field.key, next);
    };

    const addRow = () => onChange(field.key, [...rows, {}]);
    const removeRow = (index) => onChange(field.key, rows.filter((_, i) => i !== index));

    // A parent answered outside the grid — gender — can change after rows are
    // filled in, which would leave a weight class that is no longer offered.
    const outsideParents = columns
        .flatMap((column) => column.parentKeys ?? [])
        .filter((key) => !columns.some((column) => column.key === key));

    const outsideKey = outsideParents.map((key) => answers[key] ?? '').join('|');

    useEffect(() => {
        if (outsideParents.length === 0 || rows.length === 0) return;

        const cleaned = rows.map((row) => {
            const next = { ...row };

            columns.forEach((column) => {
                if (!column.parentKeys) return;

                const allowed = cellOptions(column, row).map((option) => option.value);

                if (next[column.key] && !allowed.includes(next[column.key])) {
                    delete next[column.key];

                    // Whatever hung off the cleared answer goes with it — a
                    // weight class for an age band that is no longer offered.
                    columns.forEach((other) => {
                        if (other.dependsOn === column.key) delete next[other.key];
                    });
                }
            });

            return next;
        });

        if (JSON.stringify(cleaned) !== JSON.stringify(rows)) {
            onChange(field.key, cleaned);
        }
        // Runs when a parent outside the grid changes; the rows themselves are
        // handled by updateCell.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [outsideKey]);

    const pricing = priceEntries(schema, { [field.key]: rows });

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                <span className="text-red-500 ml-0.5">*</span>
            </label>

            {field.helpText && <p className="text-xs text-gray-500 mb-3">{field.helpText}</p>}

            <div className="space-y-3">
                {rows.map((row, rowIndex) => {
                    const line = pricing?.lines?.find((l) => l.index === rowIndex);

                    return (
                        <div
                            key={rowIndex}
                            className={`border rounded-xl p-3 ${
                                line?.isRepeat ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-gray-50/50'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <div
                                    className="grid grid-cols-1 gap-2 flex-1"
                                    style={{ gridTemplateColumns: `repeat(${Math.min(columns.length, 4)}, minmax(0, 1fr))` }}
                                >
                                    {columns.map((column) => {
                                        const type = column.type ?? 'select';
                                        const blockedByParent = column.dependsOn && !row[column.dependsOn];

                                        return (
                                            <div key={column.key}>
                                                <span className="block text-[11px] font-medium text-gray-500 mb-1">
                                                    {column.label}
                                                </span>

                                                {type === 'select' ? (
                                                    <select
                                                        value={row[column.key] ?? ''}
                                                        disabled={blockedByParent}
                                                        onChange={(e) => updateCell(rowIndex, column.key, e.target.value)}
                                                        className={cell}
                                                    >
                                                        <option value="">
                                                            {blockedByParent ? 'Pick the previous first' : 'Select…'}
                                                        </option>
                                                        {cellOptions(column, row).map((option) => (
                                                            <option key={option.value} value={option.value}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type={type === 'text' ? 'text' : type}
                                                        value={row[column.key] ?? ''}
                                                        placeholder={column.placeholder || ''}
                                                        maxLength={column.maxLength}
                                                        min={column.min}
                                                        max={column.max}
                                                        onChange={(e) => updateCell(rowIndex, column.key, e.target.value)}
                                                        className={cell}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => removeRow(rowIndex)}
                                    title="Remove this entry"
                                    className="mt-5 p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {line && line.unitPrice > 0 && (
                                <div className="flex items-center justify-between gap-3 mt-2 pt-2 border-t border-gray-200/70">
                                    <span className="text-xs text-gray-500">
                                        {line.isRepeat ? (
                                            <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                                                <Tag className="w-3.5 h-3.5" />
                                                Same category again — {line.discountPct}% off
                                            </span>
                                        ) : (
                                            line.label
                                        )}
                                    </span>
                                    <span className="text-xs font-semibold text-gray-900">
                                        {line.isRepeat && (
                                            <span className="text-gray-400 line-through mr-1.5">
                                                ₹{line.unitPrice.toLocaleString('en-IN')}
                                            </span>
                                        )}
                                        ₹{line.total.toLocaleString('en-IN')}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}

                {rows.length === 0 && (
                    <p className="text-sm text-gray-400 italic py-2">No categories added yet.</p>
                )}
            </div>

            {canAdd && (
                <button
                    type="button"
                    onClick={addRow}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-regx-orange hover:text-regx-orange transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add a category
                </button>
            )}

            {!canAdd && (
                <p className="text-xs text-gray-400 mt-2">Maximum of {maxEntries} entries reached.</p>
            )}

            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </div>
    );
};

export default CategoryEntries;

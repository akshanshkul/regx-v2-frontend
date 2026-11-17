import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Pencil, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import CategoryEntries from '../../shared/forms/CategoryEntries';
import FieldRenderer from '../../shared/forms/FieldRenderer';
import { evaluate, pruneAnswers } from '../../shared/forms/ruleEngine';

/** Questions that hold nothing to import. */
const SKIP = new Set(['heading', 'display_image', 'code_block', 'file', 'image', 'signature', 'calculated']);

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** A spreadsheet cell as plain text (ExcelJS gives rich values for some cells). */
const cellText = (value) => {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'object') return String(value.text ?? value.result ?? value.richText?.map((r) => r.text).join('') ?? '');
    return String(value).trim();
};

/** What the sheet said, as the value the form stores: an option's label or value both work. */
const toValue = (text, options) => {
    if (!options?.length || text === '') return text;
    const hit = options.find((o) => norm(o.label) === norm(text) || norm(o.value) === norm(text));
    return hit ? hit.value : text;
};

const affirmative = new Set(['1', 'true', 'yes', 'accepted', 'agree', 'checked']);

const ImportRowEditor = ({ schema, answers, onChange }) => {
    const state = useMemo(() => evaluate(schema, answers), [schema, answers]);
    const fields = (schema.fields ?? []).filter((field) => (
        !SKIP.has(field.type) && state.visible[field.key] !== false
    ));

    return (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {fields.map((field) => (
                <div key={field.key} className={field.type === 'category_entries' ? 'sm:col-span-2 xl:col-span-3' : ''}>
                    {field.type === 'category_entries' ? (
                        <CategoryEntries
                            field={field}
                            schema={schema}
                            answers={state.values}
                            value={state.values[field.key]}
                            onChange={onChange}
                        />
                    ) : (
                        <FieldRenderer
                            field={field}
                            value={state.values[field.key]}
                            options={state.options[field.key] || []}
                            answers={state.values}
                            schema={schema}
                            disabled={state.disabled[field.key]}
                            required={state.required[field.key]}
                            onChange={onChange}
                        />
                    )}
                </div>
            ))}
        </div>
    );
};

/**
 * Registrations from a spreadsheet: read the file, match its columns to the
 * form's questions (guessed from the headers, changeable), check every row on
 * the server, then import the ones that pass.
 *
 * Each sheet row is one registration; a form with a categories table gets one
 * category entry from the row's category columns.
 */
const ImportRegistrations = ({ formId, onClose, onImported }) => {
    const [schema, setSchema] = useState(null);
    const [sheet, setSheet] = useState(null); // { name, headers, rows }
    const [mapping, setMapping] = useState({}); // target key -> header index
    const [paid, setPaid] = useState(true);
    const [sendReceipts, setSendReceipts] = useState(false);
    const [report, setReport] = useState(null);
    const [busy, setBusy] = useState(null);
    const [fixingRows, setFixingRows] = useState(false);
    const [correctedRows, setCorrectedRows] = useState({});
    const [correctionsDirty, setCorrectionsDirty] = useState(false);

    useEffect(() => {
        api.get(`/offline/forms/${formId}`)
            .then((p) => setSchema(p.data?.schema ?? null))
            .catch(() => toast.error('Could not load the form — is it published?'));
    }, [formId]);

    useEffect(() => {
        const confirmRefresh = (event) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', confirmRefresh);
        return () => window.removeEventListener('beforeunload', confirmRefresh);
    }, []);

    // Everything a column can be matched to: top-level questions, then each column of a categories table.
    const targets = useMemo(() => {
        const fields = schema?.fields ?? [];
        const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
        const out = [];

        fields.forEach((field) => {
            if (SKIP.has(field.type)) return;

            if (field.type === 'category_entries') {
                (field.config?.columns ?? []).forEach((column) => {
                    out.push({
                        key: `${field.key}.${column.key}`,
                        label: `${field.label ?? field.key} · ${column.label ?? column.key}`,
                        grid: field.key,
                        column: column.key,
                        fieldType: column.type ?? 'select',
                        options: byKey[column.optionsFrom]?.options ?? null,
                    });
                });
                return;
            }

            out.push({
                key: field.key,
                label: field.label ?? field.key,
                options: field.options ?? null,
                required: field.required,
                fieldType: field.type,
            });
        });

        return out;
    }, [schema]);

    const downloadTemplate = async () => {
        setBusy('template');

        try {
            const ExcelJS = (await import('exceljs')).default;
            const book = new ExcelJS.Workbook();
            const worksheet = book.addWorksheet('Registrations');
            const headers = targets.map((target) => target.label);

            worksheet.columns = headers.map((header) => ({
                width: Math.min(Math.max(header.length + 4, 16), 36),
            }));
            worksheet.addRow(headers);
            worksheet.views = [{ state: 'frozen', ySplit: 1 }];
            worksheet.autoFilter = {
                from: { row: 1, column: 1 },
                to: { row: 1, column: headers.length },
            };
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FF1F2937' } };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7F5EB' } };

            const buffer = await book.xlsx.writeBuffer();
            const url = URL.createObjectURL(new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            }));
            const link = document.createElement('a');
            link.href = url;
            link.download = 'registrations-template.xlsx';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
            toast.error('Could not create the Excel template.');
        } finally {
            setBusy(null);
        }
    };

    const resetFixes = () => {
        setReport(null);
        setFixingRows(false);
        setCorrectedRows({});
        setCorrectionsDirty(false);
    };

    const readFile = async (file) => {
        if (!file) return;
        setBusy('read');
        resetFixes();

        try {
            const ExcelJS = (await import('exceljs')).default;
            const book = new ExcelJS.Workbook();
            const buffer = await file.arrayBuffer();

            if (file.name.toLowerCase().endsWith('.csv')) {
                await book.csv.read(new Blob([buffer]).stream());
            } else {
                await book.xlsx.load(buffer);
            }

            const ws = book.worksheets[0];
            const all = [];
            ws.eachRow({ includeEmpty: false }, (row) => all.push(row.values.slice(1).map(cellText)));

            const [headers = [], ...rows] = all;
            const filled = rows.filter((r) => r.some((c) => c !== ''));

            setSheet({ name: file.name, headers, rows: filled });

            // A first guess from the headers: the same words as a question's label or key.
            const guess = {};
            targets.forEach((t) => {
                const tail = t.label.split('·').pop();
                const i = headers.findIndex((h) => [norm(t.label), norm(tail), norm(t.column ?? t.key)].includes(norm(h)));
                if (i >= 0) guess[t.key] = i;
            });
            setMapping(guess);
        } catch {
            toast.error('Could not read that file. Use .xlsx or .csv with the column names in the first row.');
        } finally {
            setBusy(null);
        }
    };

    const answersOf = (row) => {
        const answers = {};
        const grids = {};

        targets.forEach((t) => {
            const i = mapping[t.key];
            if (i === undefined || i === '') return;

            const value = toValue(row[i] ?? '', t.options);

            if (t.grid) {
                if (value !== '') grids[t.grid] = { ...(grids[t.grid] ?? {}), [t.column]: value };
            } else if (t.fieldType === 'terms') {
                if (affirmative.has(norm(value))) answers[t.key] = true;
            } else if (value !== '') {
                answers[t.key] = value;
            }
        });

        Object.entries(grids).forEach(([grid, entry]) => { answers[grid] = [entry]; });

        return answers;
    };

    const send = async (dryRun) => {
        setBusy(dryRun ? 'check' : 'import');

        try {
            const payload = await api.post(`/offline/forms/${formId}/import`, {
                rows: sheet.rows.map((row, index) => correctedRows[index] ?? answersOf(row)), paid, sendReceipts, dryRun,
            });
            setReport(payload.data);
            if (dryRun) setCorrectionsDirty(false);
            toast.success(payload.message);
            if (!dryRun && payload.data?.ok > 0) onImported?.();
        } catch (error) {
            toast.error(error?.response?.data?.messages?.rows || error?.response?.data?.message || 'Import failed');
        } finally {
            setBusy(null);
        }
    };

    const failed = (report?.results ?? []).filter((r) => !r.ok);
    const select = 'w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-regx-orange';
    const beginFixing = () => {
        const rows = {};
        failed.forEach((result) => {
            const index = result.row - 1;
            rows[index] = correctedRows[index] ?? answersOf(sheet.rows[index]);
        });
        setCorrectedRows((current) => ({ ...current, ...rows }));
        setFixingRows(true);
        setCorrectionsDirty(true);
    };

    const updateCorrection = (rowIndex, key, value) => {
        setCorrectedRows((current) => {
            const answers = { ...(current[rowIndex] ?? {}), [key]: value };
            return {
                ...current,
                [rowIndex]: pruneAnswers(schema, answers, evaluate(schema, answers)),
            };
        });
        setCorrectionsDirty(true);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[96vw] 2xl:max-w-[1440px] max-h-[calc(100vh-1rem)] flex flex-col" role="dialog" aria-modal="true" aria-label="Import registrations" onClick={(e) => e.stopPropagation()}>
                <header className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-50 text-green-700 flex items-center justify-center shrink-0"><FileSpreadsheet className="w-5 h-5" /></div>
                        <div>
                            <h2 className="font-bold text-gray-900 text-lg">Import registrations</h2>
                            <p className="text-xs text-gray-500">From an Excel or CSV sheet — one row per athlete, column names in the first row. Every row is checked like a registration on the form.</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close"><X className="w-5 h-5" /></button>
                </header>

                <div className="p-5 space-y-5 flex-1 min-h-0 overflow-y-auto">
                    {!schema ? (
                        <div className="py-12 flex justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm text-gray-600">Start with a template containing this form’s importable fields.</p>
                                <button
                                    type="button"
                                    onClick={downloadTemplate}
                                    disabled={busy !== null || targets.length === 0}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    {busy === 'template' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    Download Excel template
                                </button>
                            </div>
                            <label className="flex items-center gap-3 rounded-xl border-2 border-dashed border-gray-300 p-4 cursor-pointer hover:border-regx-orange">
                                {busy === 'read' ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : <Upload className="w-5 h-5 text-gray-400" />}
                                <span className="text-sm text-gray-700">{sheet ? `${sheet.name} — ${sheet.rows.length} rows` : 'Choose a .xlsx or .csv file'}</span>
                                <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => readFile(e.target.files?.[0])} />
                            </label>

                            {sheet && (
                                <>
                                    <section>
                                        <p className="text-sm font-semibold text-gray-800 mb-2">Match the columns</p>
                                        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
                                            {targets.map((t) => (
                                                <label key={t.key} className="block">
                                                    <span className="block text-xs text-gray-600 mb-0.5 truncate">{t.label}{t.required ? ' *' : ''}</span>
                                                    <select className={select} value={mapping[t.key] ?? ''} onChange={(e) => {
                                                        resetFixes();
                                                        setMapping((m) => ({ ...m, [t.key]: e.target.value === '' ? '' : Number(e.target.value) }));
                                                    }}>
                                                        <option value="">— not in the sheet —</option>
                                                        {sheet.headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                                                    </select>
                                                </label>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700">
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="w-4 h-4 accent-regx-orange" /> Fees already paid (offline)</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" checked={sendReceipts} onChange={(e) => setSendReceipts(e.target.checked)} className="w-4 h-4 accent-regx-orange" /> Email each athlete their receipt</label>
                                    </section>

                                    {report && (
                                        <section className={`rounded-xl p-4 ${report.failed ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                                            <p className="text-sm font-semibold flex items-center gap-2">
                                                {report.failed ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : <CheckCircle2 className="w-4 h-4 text-green-600" />}
                                                {report.dryRun ? `${report.ok} ready, ${report.failed} with problems` : `${report.ok} imported, ${report.failed} skipped`}
                                            </p>
                                            {failed.length > 0 && (
                                                <ul className="mt-2 space-y-1 text-xs text-amber-900 max-h-48 overflow-y-auto">
                                                    {failed.map((r) => <li key={r.row}><strong>Row {r.row + 1}:</strong> {r.errors.join(' ')}</li>)}
                                                </ul>
                                            )}
                                            {report.dryRun && failed.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={beginFixing}
                                                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                    {fixingRows ? 'Refresh failed rows to fix' : 'Fix failed rows'}
                                                </button>
                                            )}
                                        </section>
                                    )}

                                    {fixingRows && failed.map((result) => {
                                        const rowIndex = result.row - 1;
                                        const row = sheet.rows[rowIndex] ?? [];
                                        const answers = correctedRows[rowIndex] ?? answersOf(row);

                                        return (
                                            <section key={result.row} className="rounded-xl border border-amber-200 p-4 space-y-4">
                                                <div>
                                                    <h3 className="text-sm font-semibold text-gray-900">Fix spreadsheet row {result.row + 1}</h3>
                                                    <p className="mt-1 text-xs text-amber-800">{result.errors.join(' ')}</p>
                                                </div>
                                                <details className="rounded-lg bg-gray-50 px-3 py-2">
                                                    <summary className="cursor-pointer text-xs font-semibold text-gray-700">Show original spreadsheet data</summary>
                                                    <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200">
                                                        <table className="w-full min-w-max border-collapse text-left text-xs">
                                                            <thead className="bg-gray-100 text-gray-600">
                                                                <tr>
                                                                    {sheet.headers.map((header, index) => (
                                                                        <th key={index} className="border-b border-r border-gray-200 px-3 py-2 font-semibold last:border-r-0">
                                                                            {header || `Column ${index + 1}`}
                                                                        </th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white text-gray-800">
                                                                <tr>
                                                                    {sheet.headers.map((_, index) => (
                                                                        <td key={index} className="border-r border-gray-200 px-3 py-2 whitespace-nowrap last:border-r-0">
                                                                            {row[index] || '—'}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </details>
                                                <ImportRowEditor
                                                    schema={schema}
                                                    answers={answers}
                                                    onChange={(key, value) => updateCorrection(rowIndex, key, value)}
                                                />
                                            </section>
                                        );
                                    })}
                                </>
                            )}
                        </>
                    )}
                </div>

                <footer className="flex items-center justify-end gap-2 p-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-white">Close</button>
                    <button type="button" onClick={() => send(true)} disabled={!sheet || busy !== null} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-800 hover:bg-white disabled:opacity-50">
                        {busy === 'check' && <Loader2 className="w-4 h-4 animate-spin" />} Check
                    </button>
                    <button type="button" onClick={() => send(false)} disabled={!sheet || busy !== null || (report?.dryRun && report.ok === 0) || (fixingRows && correctionsDirty)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-regx-orange text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                        {busy === 'import' && <Loader2 className="w-4 h-4 animate-spin" />} Import
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ImportRegistrations;

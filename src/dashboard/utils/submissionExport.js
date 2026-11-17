/**
 * Excel, PDF and print for form submissions — all built in the browser.
 *
 * The server hands back the flattened sheet and the readable submissions; the
 * file itself is assembled here, so exporting a few thousand registrations
 * costs the API one query instead of a spreadsheet engine and a PDF renderer.
 *
 * The heavy libraries are imported only when someone actually exports, so they
 * never land in the dashboard's initial bundle.
 */

import { parseServerDate } from '../../shared/utils/dates';

const PAGE = { width: 210, height: 297, margin: 14 };

const download = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Revoked on the next tick — Safari cancels the download if the URL dies
    // while the click is still being handled.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** e.g. open-championship-2026-09-13.xlsx */
export const exportFilename = (formName, extension) => {
    const slug = String(formName || 'registrations')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const today = new Date().toISOString().slice(0, 10);

    return `${slug || 'registrations'}-${today}.${extension}`;
};

// ----------------------------------------------------------------------- xlsx

/**
 * One row per entry, so every player of every team is its own line — each one
 * still carrying the team name and registration ID it belongs to.
 */
export const buildWorkbook = async (sheet, sheetName = 'Registrations') => {
    const ExcelJS = (await import('exceljs')).default;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'RegX';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(sheetName, {
        views: [{ state: 'frozen', ySplit: 1 }],
    });

    worksheet.addRow(sheet.columns);
    sheet.rows.forEach((row, index) => {
        const added = worksheet.addRow(row);
        // Optional background per row, as 'RRGGBB' (or null for none).
        const fill = sheet.rowFills?.[index];

        if (fill) {
            added.eachCell({ includeEmpty: true }, (cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${fill}` } };
            });
        }
    });

    const header = worksheet.getRow(1);
    header.font = { bold: true };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    header.border = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } } };

    // Filter dropdowns on the header, so a roster of a few hundred players is
    // usable the moment the file opens.
    if (sheet.rows.length > 0) {
        worksheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: sheet.rows.length + 1, column: sheet.columns.length },
        };
    }

    // Widths from the widest cell in each column, capped so one long signature
    // does not push everything else off the screen.
    worksheet.columns = sheet.columns.map((label, index) => {
        const longest = sheet.rows.reduce(
            (max, row) => Math.max(max, String(row[index] ?? '').length),
            String(label).length
        );

        return { width: Math.min(Math.max(longest + 2, 10), 40) };
    });

    return workbook.xlsx.writeBuffer();
};

export const exportExcel = async (sheet, formName) => exportExcelRows(sheet, formName);

/** Any columns/rows sheet, not just the registrations one. */
export const exportExcelRows = async (sheet, formName, sheetName) => {
    const buffer = await buildWorkbook(sheet, sheetName);

    download(
        new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        exportFilename(formName, 'xlsx')
    );
};

// ------------------------------------------------------------------------ pdf

/**
 * One block per registration rather than one wide table — a roster only makes
 * sense listed under the team it belongs to, and the same layout serves a
 * single registration without a second template.
 */
export const buildPdf = async (submissions, { formName, eventTitle }) => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const width = PAGE.width - PAGE.margin * 2;

    let y = PAGE.margin;

    // --- document heading
    doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(17, 24, 39);
    doc.text(String(formName), PAGE.margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(107, 114, 128);
    doc.text(
        [
            eventTitle,
            `${submissions.length} registration${submissions.length === 1 ? '' : 's'}`,
            `Generated ${new Date().toLocaleString('en-IN')}`,
        ]
            .filter(Boolean)
            .join('   ·   '),
        PAGE.margin,
        y
    );
    y += 3;

    doc.setDrawColor(17, 24, 39).setLineWidth(0.4);
    doc.line(PAGE.margin, y, PAGE.margin + width, y);
    y += 7;

    /** Starts a new page when the next block would not fit. */
    const reserve = (height) => {
        if (y + height > PAGE.height - PAGE.margin) {
            doc.addPage();
            y = PAGE.margin;
        }
    };

    submissions.forEach((submission) => {
        reserve(34);

        doc.setFont('courier', 'normal').setFontSize(7.5).setTextColor(107, 114, 128);
        doc.text(String(submission.reference), PAGE.margin, y);

        doc.setFont('helvetica', 'normal').setFontSize(7.5);
        doc.text(printDate(submission.created_at), PAGE.margin + width, y, { align: 'right' });
        y += 5;

        doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(17, 24, 39);
        doc.text(String(submission.participant ?? '—'), PAGE.margin, y);

        doc.setFont('helvetica', 'bold').setFontSize(9);
        doc.text(
            `${submission.currency ?? 'INR'} ${Number(submission.amount || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
            })}`,
            PAGE.margin + width,
            y,
            { align: 'right' }
        );
        y += 4.5;

        doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(107, 114, 128);
        doc.text(
            [
                submission.participantType?.label,
                submission.email,
                submission.phone,
                `Payment: ${String(submission.payment_status ?? '').replace('_', ' ')}`,
            ]
                .filter(Boolean)
                .join('  ·  '),
            PAGE.margin,
            y
        );
        y += 4;

        // --- repeatable grids: the roster, or an individual's own categories
        (submission.entries ?? []).forEach((grid) => {
            reserve(16);

            doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(17, 24, 39);
            doc.text(`${grid.label} (${grid.rows.length})`, PAGE.margin, y);
            y += 2;

            autoTable(doc, {
                startY: y,
                margin: { left: PAGE.margin, right: PAGE.margin },
                theme: 'grid',
                styles: { fontSize: 7.5, cellPadding: 1.4, textColor: [17, 24, 39], lineColor: [229, 231, 235] },
                headStyles: { fillColor: [243, 244, 246], textColor: [75, 85, 99], fontStyle: 'bold' },
                head: [['#', ...grid.columns.map((column) => column.label)]],
                body: grid.rows.map((entry, index) => [
                    index + 1,
                    ...grid.columns.map((column) => entry[column.key] ?? '—'),
                ]),
                columnStyles: { 0: { cellWidth: 7, textColor: [156, 163, 175] } },
            });

            y = doc.lastAutoTable.finalY + 4;
        });

        // --- every other answer, grouped by the section it was asked in
        const sections = (submission.details ?? [])
            .map((section) => ({
                ...section,
                items: section.items.filter((item) => item.value !== null && item.value !== ''),
            }))
            .filter((section) => section.items.length > 0);

        sections.forEach((section) => {
            autoTable(doc, {
                startY: y,
                margin: { left: PAGE.margin, right: PAGE.margin },
                theme: 'plain',
                styles: { fontSize: 7.5, cellPadding: 1, textColor: [17, 24, 39] },
                headStyles: { fontSize: 7, fontStyle: 'bold', textColor: [107, 114, 128] },
                head: [[section.title.toUpperCase(), '']],
                body: section.items.map((item) => [item.label, answerText(item.value)]),
                columnStyles: {
                    0: { cellWidth: width * 0.35, textColor: [107, 114, 128] },
                },
            });

            y = doc.lastAutoTable.finalY + 2;
        });

        y += 3;
        doc.setDrawColor(229, 231, 235).setLineWidth(0.2);
        doc.line(PAGE.margin, y, PAGE.margin + width, y);
        y += 6;
    });

    // --- page numbers, once every page exists
    const pages = doc.getNumberOfPages();

    for (let page = 1; page <= pages; page++) {
        doc.setPage(page);
        doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(156, 163, 175);
        doc.text(`${page} / ${pages}`, PAGE.width - PAGE.margin, PAGE.height - 8, { align: 'right' });
    }

    return doc;
};

export const exportPdf = async (submissions, labels) => {
    const doc = await buildPdf(submissions, labels);

    doc.save(exportFilename(labels.formName, 'pdf'));
};

// ---------------------------------------------------------------------- print

const printDate = (value) => {
    const date = parseServerDate(value);

    return Number.isNaN(date.getTime())
        ? String(value ?? '')
        : date.toLocaleString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
          });
};

/** An answer as plain text; an attached file reads as its name and link. */
export const answerText = (value) =>
    value && typeof value === 'object' && value._type === 'file'
        ? [value.name, value.url].filter(Boolean).join(' — ')
        : String(value);

const escapeHtml = (value) =>
    String(value ?? '').replace(
        /[&<>"']/g,
        (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
    );

const PRINT_STYLES = `
    @page { margin: 14mm; }
    * { box-sizing: border-box; }
    body { font: 11px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; margin: 0; }
    .head { border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 14px; }
    .head h1 { font-size: 17px; margin: 0 0 3px; }
    .head p { margin: 0; font-size: 10px; color: #6b7280; }
    .reg { border: 1px solid #d1d5db; border-radius: 6px; padding: 11px 13px; margin-bottom: 12px; page-break-inside: avoid; }
    .reg-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
               border-bottom: 1px solid #e5e7eb; padding-bottom: 7px; margin-bottom: 8px; }
    .ref { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; color: #6b7280; }
    .who { font-size: 15px; font-weight: 700; margin: 1px 0; }
    .meta { font-size: 10px; color: #6b7280; }
    .amount { font-size: 14px; font-weight: 700; white-space: nowrap; }
    .badge { display: inline-block; border: 1px solid #9ca3af; border-radius: 3px; padding: 0 4px; font-size: 9px; }
    table { width: 100%; border-collapse: collapse; }
    .grid { margin: 4px 0 9px; }
    .grid caption { text-align: left; font-size: 10px; font-weight: 700; padding-bottom: 4px; }
    .grid th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: .03em;
               color: #6b7280; border-bottom: 1px solid #d1d5db; padding: 3px 5px; }
    .grid td { padding: 3px 5px; border-bottom: 1px solid #f3f4f6; }
    .grid td.n { color: #9ca3af; width: 20px; }
    .sections { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px 16px; }
    .sections h3 { font-size: 9px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; margin: 0 0 3px; }
    .answers td { padding: 1.5px 0; vertical-align: top; font-size: 10px; }
    .answers .l { color: #6b7280; width: 42%; padding-right: 8px; }
    .empty { color: #9ca3af; font-style: italic; }
    @media print { .reg { border-color: #9ca3af; } }
`;

const gridHtml = (grid) => `
    <table class="grid">
        <caption>${escapeHtml(grid.label)} (${grid.rows.length})</caption>
        <thead>
            <tr>
                <th class="n">#</th>
                ${grid.columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('')}
            </tr>
        </thead>
        <tbody>
            ${grid.rows
                .map(
                    (entry, index) => `
                        <tr>
                            <td class="n">${index + 1}</td>
                            ${grid.columns
                                .map((c) => `<td>${escapeHtml(entry[c.key] || '—')}</td>`)
                                .join('')}
                        </tr>`
                )
                .join('')}
        </tbody>
    </table>
`;

const sectionHtml = (section) => `
    <div>
        <h3>${escapeHtml(section.title)}</h3>
        <table class="answers">
            ${section.items
                .map(
                    (item) => `
                        <tr>
                            <td class="l">${escapeHtml(item.label)}</td>
                            <td>${
                                item.value && typeof item.value === 'object' && item.value._type === 'file'
                                    ? `<a href="${escapeHtml(item.value.url)}">${escapeHtml(item.value.name || 'File')}</a>`
                                    : escapeHtml(item.value)
                            }</td>
                        </tr>`
                )
                .join('')}
        </table>
    </div>
`;

const submissionHtml = (submission) => {
    const sections = (submission.details ?? [])
        .map((section) => ({
            ...section,
            items: section.items.filter((item) => item.value !== null && item.value !== ''),
        }))
        .filter((section) => section.items.length > 0);

    return `
        <div class="reg">
            <div class="reg-top">
                <div>
                    <div class="ref">${escapeHtml(submission.reference)}</div>
                    <div class="who">${escapeHtml(submission.participant ?? '—')}</div>
                    <div class="meta">
                        ${
                            submission.participantType
                                ? `<span class="badge">${escapeHtml(submission.participantType.label)}</span> `
                                : ''
                        }
                        ${[submission.email, submission.phone].filter(Boolean).map(escapeHtml).join(' · ')}
                    </div>
                </div>
                <div style="text-align:right">
                    <div class="meta">${escapeHtml(printDate(submission.created_at))}</div>
                    <div class="amount">${escapeHtml(submission.currency ?? 'INR')} ${Number(
                        submission.amount || 0
                    ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    <div class="meta">
                        <span class="badge">${escapeHtml(
                            String(submission.payment_status ?? '').replace('_', ' ')
                        )}</span>
                    </div>
                </div>
            </div>

            ${(submission.entries ?? []).map(gridHtml).join('')}

            <div class="sections">${sections.map(sectionHtml).join('')}</div>
        </div>
    `;
};

/** The printable document as HTML — also what the print dialog renders. */
export const buildPrintHtml = (submissions, { formName, eventTitle }) => `
        <!doctype html>
        <html>
            <head>
                <meta charset="utf-8">
                <title>${escapeHtml(formName)}</title>
                <style>${PRINT_STYLES}</style>
            </head>
            <body>
                <div class="head">
                    <h1>${escapeHtml(formName)}</h1>
                    <p>${[
                        eventTitle,
                        `${submissions.length} registration${submissions.length === 1 ? '' : 's'}`,
                        `Generated ${new Date().toLocaleString('en-IN')}`,
                    ]
                        .filter(Boolean)
                        .map(escapeHtml)
                        .join(' &nbsp;·&nbsp; ')}</p>
                </div>
                ${
                    submissions.length === 0
                        ? '<p class="empty">No registrations to print.</p>'
                        : submissions.map(submissionHtml).join('')
                }
            </body>
        </html>
`;

/**
 * Prints any sectioned table — a category list, a weigh-in sheet — using the
 * same page furniture as the registration print, so everything the organiser
 * hands out looks like it came from the same system.
 *
 * @param {{title: string, subtitle?: string, sections: Array<{
 *   title: string, columns: string[], rows: string[][], blankColumns?: number
 * }>}} document
 */
export const buildPrintDocument = ({ title, subtitle, sections }) => {
    const body = sections
        .map(
            (section) => `
                <div class="sheet">
                    <h2>${escapeHtml(section.title)}<span>${section.rows.length}</span></h2>
                    <table class="grid">
                        <thead>
                            <tr>${section.columns
                                .map((column, index) => {
                                    const blank = index >= section.columns.length - (section.blankColumns ?? 0);

                                    return `<th${blank ? ' class="blank"' : ''}>${escapeHtml(column)}</th>`;
                                })
                                .join('')}</tr>
                        </thead>
                        <tbody>
                            ${section.rows
                                .map(
                                    (row) =>
                                        `<tr>${row
                                            .map((cell, index) => {
                                                const blank =
                                                    index >= section.columns.length - (section.blankColumns ?? 0);

                                                return `<td${blank ? ' class="blank"' : ''}>${escapeHtml(
                                                    cell || (blank ? '' : '—')
                                                )}</td>`;
                                            })
                                            .join('')}</tr>`
                                )
                                .join('')}
                        </tbody>
                    </table>
                </div>`
        )
        .join('');

    openPrintFrame(`
        <!doctype html>
        <html>
            <head>
                <meta charset="utf-8">
                <title>${escapeHtml(title)}</title>
                <style>
                    ${PRINT_STYLES}
                    .sheet { page-break-inside: avoid; margin-bottom: 14px; }
                    .sheet h2 { font-size: 12px; margin: 0 0 4px; display: flex; align-items: baseline; gap: 8px; }
                    .sheet h2 span { font-size: 10px; font-weight: 400; color: #6b7280; }
                    .sheet .grid th, .sheet .grid td { border-bottom: 1px solid #e5e7eb; }
                    .blank { background: #fafafa; min-width: 70px; }
                    td.blank { height: 22px; }
                </style>
            </head>
            <body>
                <div class="head">
                    <h1>${escapeHtml(title)}</h1>
                    ${subtitle ? `<p>${escapeHtml(subtitle)} &nbsp;·&nbsp; Generated ${escapeHtml(
                        new Date().toLocaleString('en-IN')
                    )}</p>` : ''}
                </div>
                ${sections.length === 0 ? '<p class="empty">Nothing to print.</p>' : body}
            </body>
        </html>
    `);
};

export const printWeighInReceipt = ({ formName, registration, weight, weighedAt, paperSize }) => {
    const page = paperSize === 'A4'
        ? 'A4'
        : paperSize === '58mm'
            ? '58mm auto'
            : '80mm auto';
    const categories = (registration.entries ?? [])
        .flatMap((entry) => (entry.rows ?? []).map((row) => ({
            title: entry.label,
            values: entry.columns.map((column) => row[column.key]).filter(Boolean).join(' · '),
        })))
        .filter((category) => category.values);
    const details = [
        ['Player', registration.participant || 'Unnamed player'],
        ['Email', registration.email || '—'],
        ['Phone', registration.phone || '—'],
        ...categories.map((category, index) => [
            categories.length > 1 ? `${category.title} ${index + 1}` : category.title,
            category.values,
        ]),
        ['Measured weight', `${weight} kg`],
        ['Date/time', new Date(String(weighedAt).replace(' ', 'T')).toLocaleString('en-IN')],
    ];

    openPrintFrame(`
        <!doctype html>
        <html>
            <head>
                <meta charset="utf-8">
                <title>${escapeHtml(formName)} — weigh-in receipt</title>
                <style>
                    @page { size: ${page}; margin: ${paperSize === 'A4' ? '14mm' : '4mm'}; }
                    * { box-sizing: border-box; }
                    body { font: 12px Arial, sans-serif; color: #111827; width: 100%; margin: 0; }
                    h1 { font-size: 16px; margin: 0 0 4px; }
                    h2 { font-size: 13px; margin: 0 0 12px; color: #4b5563; }
                    table { width: 100%; border-collapse: collapse; }
                    td { padding: 5px 0; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
                    td:first-child { font-weight: 600; padding-right: 8px; }
                </style>
            </head>
            <body>
                <h1>${escapeHtml(formName)}</h1>
                <h2>Weigh-in receipt</h2>
                <table>
                    <tbody>${details.map(([label, value]) =>
                        `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`
                    ).join('')}</tbody>
                </table>
            </body>
        </html>
    `);
};

/**
 * Opens the browser's print dialog on a rendered copy of these registrations.
 *
 * Printed from a hidden iframe rather than a popup, so nothing is blocked and
 * the dashboard behind it is untouched. "Save as PDF" in that dialog is also
 * the quickest route to a paper-faithful PDF.
 */
export const printSubmissions = (submissions, labels) =>
    openPrintFrame(buildPrintHtml(submissions, labels));

/**
 * Renders html into a hidden iframe and prints it. An iframe rather than a
 * popup, so nothing is blocked and the dashboard behind it is untouched.
 */
const openPrintFrame = (html) => {
    const frame = document.createElement('iframe');

    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(frame);

    const doc = frame.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    // The dialog is modal, so the frame can only be cleaned up once focus comes
    // back to the page.
    const cleanUp = () => {
        window.removeEventListener('focus', cleanUp);
        setTimeout(() => frame.remove(), 500);
    };

    frame.onload = () => {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        window.addEventListener('focus', cleanUp);
    };
};

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
import notoSansBoldUrl from '../assets/fonts/NotoSans-Bold.ttf?url';
import notoSansRegularUrl from '../assets/fonts/NotoSans-Regular.ttf?url';

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
export const buildPdf = async (submissions, { formName, eventTitle }, reportData = null) => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const width = PAGE.width - PAGE.margin * 2;

    let y = PAGE.margin;

    /** Starts a new page when the next block would not fit. */
    const reserve = (height) => {
        if (y + height > PAGE.height - PAGE.margin) {
            doc.addPage();
            y = PAGE.margin;
        }
    };

    const sectionTitle = (title) => {
        reserve(12);
        doc.setFillColor(255, 247, 237);
        doc.rect(PAGE.margin, y, width, 8, 'F');
        doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(124, 45, 18);
        doc.text(String(title), PAGE.margin + 3, y + 5.4);
        y += 11;
    };

    const drawBars = (items, color = [249, 115, 22]) => {
        const maximum = Math.max(1, ...items.map((item) => Number(item.count) || 0));

        items.forEach((item) => {
            reserve(11);
            const labelLines = doc.splitTextToSize(String(item.label || '—'), width - 24);
            doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(55, 65, 81);
            doc.text(labelLines[0] || '—', PAGE.margin, y + 3);
            doc.setFont('helvetica', 'bold').setTextColor(31, 41, 55);
            doc.text(
                `${Number(item.count) || 0}${item.suffix ? ` · ${item.suffix}` : ''}`,
                PAGE.margin + width,
                y + 3,
                { align: 'right' }
            );
            y += 4;

            doc.setFillColor(243, 244, 246);
            doc.rect(PAGE.margin, y, width, 2, 'F');
            const barWidth = width * Math.max(0, Math.min(1, (Number(item.count) || 0) / maximum));
            if (barWidth > 0) {
                doc.setFillColor(...color);
                doc.rect(PAGE.margin, y, barWidth, 2, 'F');
            }
            y += 6;
        });
    };

    if (reportData) {
        doc.setFillColor(17, 24, 39);
        doc.rect(0, 0, PAGE.width, 47, 'F');
        doc.setFillColor(249, 115, 22);
        doc.rect(0, 0, 4, 47, 'F');
        doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(255, 255, 255);
        doc.text(doc.splitTextToSize(String(formName || 'Form report'), width).slice(0, 2), PAGE.margin, 17);
        doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(253, 186, 116);
        doc.text([eventTitle, 'Full form report'].filter(Boolean).join(' · '), PAGE.margin, 32);
        doc.setTextColor(209, 213, 219);
        doc.text(`Generated ${new Date().toLocaleString('en-IN')}`, PAGE.margin, 40);
        y = 54;
    } else {
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
    }

    if (reportData) {
        const paidRows = submissions.filter((row) => row.payment_status === 'paid');
        const collected = paidRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
        const entryCounts = new Map();
        let entryTotal = 0;

        submissions.forEach((submission) => {
            (submission.entries ?? []).forEach((grid) => {
                (grid.rows ?? []).forEach((entry) => {
                    entryTotal += 1;
                    const category = grid.columns
                        .filter((column) => (column.type ?? 'select') === 'select')
                        .map((column) => entry[column.key])
                        .filter(Boolean)
                        .join(' · ');
                    if (category) entryCounts.set(category, (entryCounts.get(category) ?? 0) + 1);
                });
            });
        });

        const paymentGroups = new Map();
        submissions.forEach((row) => {
            const status = row.payment_status === 'paid'
                ? (row.payment_method === 'cash' ? 'Paid in cash' : 'Paid online')
                : String(row.payment_status || 'Unknown').replaceAll('_', ' ');
            const group = paymentGroups.get(status) ?? { count: 0, amount: 0 };
            group.count += 1;
            group.amount += Number(row.amount) || 0;
            paymentGroups.set(status, group);
        });

        const metrics = [
            ['Registrations', Number(reportData.meta?.total ?? submissions.length).toLocaleString('en-IN'), [255, 237, 213]],
            ['Player entries', entryTotal.toLocaleString('en-IN'), [237, 233, 254]],
            ['Paid', paidRows.length.toLocaleString('en-IN'), [220, 252, 231]],
            ['Collected', `INR ${collected.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, [219, 234, 254]],
        ];
        const gap = 3;
        const cardWidth = (width - gap * (metrics.length - 1)) / metrics.length;
        reserve(25);
        metrics.forEach(([label, value, fill], index) => {
            const x = PAGE.margin + index * (cardWidth + gap);
            doc.setFillColor(...fill);
            doc.rect(x, y, cardWidth, 22, 'F');
            doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(75, 85, 99);
            doc.text(label, x + 3, y + 6);
            doc.setFontSize(11).setTextColor(17, 24, 39);
            doc.text(doc.splitTextToSize(String(value), cardWidth - 6).slice(0, 2), x + 3, y + 14);
        });
        y += 28;

        if (reportData.meta?.capped) {
            doc.setFont('NotoSans', 'normal').setFontSize(7).setTextColor(146, 64, 14);
            doc.text(
                `Analytics and detail tables include the first ${submissions.length.toLocaleString('en-IN')} rows; total registrations: ${Number(reportData.meta.total).toLocaleString('en-IN')}.`,
                PAGE.margin,
                y
            );
            y += 6;
        }

        sectionTitle('Registration activity · last 7 days');
        reserve(44);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const days = Array.from({ length: 7 }, (_, index) => {
            const date = new Date(today);
            date.setDate(today.getDate() - (6 - index));
            return {
                key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
                label: date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
                count: 0,
            };
        });
        const dayMap = new Map(days.map((day) => [day.key, day]));
        submissions.forEach((row) => {
            const date = parseServerDate(row.created_at);
            if (Number.isNaN(date.getTime())) return;
            const day = dayMap.get(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
            if (day) day.count += 1;
        });

        const plotBottom = y + 29;
        const maximumDaily = Math.max(1, ...days.map((day) => day.count));
        const slot = width / days.length;
        days.forEach((day, index) => {
            const barWidth = Math.min(12, slot * 0.55);
            const barHeight = (day.count / maximumDaily) * 23;
            const x = PAGE.margin + slot * (index + 0.5);
            doc.setFillColor(249, 115, 22);
            if (barHeight > 0) doc.rect(x - barWidth / 2, plotBottom - barHeight, barWidth, barHeight, 'F');
            doc.setFont('helvetica', 'bold').setFontSize(7).setTextColor(55, 65, 81);
            doc.text(String(day.count), x, plotBottom - barHeight - 2, { align: 'center' });
            doc.setFont('helvetica', 'normal').setTextColor(107, 114, 128);
            doc.text(day.label, x, plotBottom + 5, { align: 'center' });
        });
        y = plotBottom + 11;

        sectionTitle('Payment status breakdown');
        drawBars(
            [...paymentGroups.entries()]
                .sort((a, b) => b[1].count - a[1].count)
                .map(([label, group]) => ({ label, count: group.count, suffix: `INR ${group.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` })),
            [16, 185, 129]
        );

        const categoryRows = [...entryCounts.entries()]
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
        if (categoryRows.length > 0) {
            sectionTitle('Player entries by category');
            drawBars(categoryRows.slice(0, 10), [124, 58, 237]);
            autoTable(doc, {
                startY: y,
                margin: { left: PAGE.margin, right: PAGE.margin },
                theme: 'striped',
                head: [['Category', 'Entries']],
                body: categoryRows.map((item) => [item.label, item.count]),
                styles: { fontSize: 7, cellPadding: 1.5 },
                headStyles: { fillColor: [91, 33, 182], textColor: [255, 255, 255] },
            });
            y = doc.lastAutoTable.finalY + 5;
        }

        sectionTitle('Payment totals');
        autoTable(doc, {
            startY: y,
            margin: { left: PAGE.margin, right: PAGE.margin },
            theme: 'striped',
            head: [['Payment status', 'Registrations', 'Amount']],
            body: [...paymentGroups.entries()].map(([status, group]) => [
                status,
                group.count,
                `INR ${group.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            ]),
            styles: { fontSize: 7, cellPadding: 1.7 },
            headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255] },
        });
        y = doc.lastAutoTable.finalY + 5;

        const fields = reportData.summary?.fields ?? [];
        if (fields.length > 0) {
            sectionTitle('Form answer counts and insights');
            fields.forEach((field) => {
                sectionTitle(`${field.label} · ${field.answered} answered, ${field.skipped} skipped`);
                if (field.kind === 'choice') {
                    drawBars(
                        (field.options ?? []).map((option) => ({
                            label: option.label,
                            count: option.count,
                            suffix: `${option.percent}%`,
                        })),
                        [249, 115, 22]
                    );
                } else if (field.kind === 'number') {
                    autoTable(doc, {
                        startY: y,
                        margin: { left: PAGE.margin, right: PAGE.margin },
                        head: [['Minimum', 'Maximum', 'Average', 'Median']],
                        body: [[field.min ?? '—', field.max ?? '—', field.average ?? '—', field.median ?? '—']],
                        styles: { fontSize: 7, cellPadding: 1.7 },
                        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
                    });
                    y = doc.lastAutoTable.finalY + 4;
                } else if (field.kind === 'date') {
                    autoTable(doc, {
                        startY: y,
                        margin: { left: PAGE.margin, right: PAGE.margin },
                        head: [['Earliest', 'Latest']],
                        body: [[field.earliest ?? '—', field.latest ?? '—']],
                        styles: { fontSize: 7, cellPadding: 1.7 },
                        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
                    });
                    y = doc.lastAutoTable.finalY + 4;
                } else if (field.kind === 'open') {
                    autoTable(doc, {
                        startY: y,
                        margin: { left: PAGE.margin, right: PAGE.margin },
                        head: [['Submitted answers']],
                        body: (field.answers ?? []).map((answer) => [answer]),
                        styles: { fontSize: 7, cellPadding: 1.7, overflow: 'linebreak' },
                        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
                    });
                    y = doc.lastAutoTable.finalY + 3;
                    if (field.more > 0) {
                        doc.setFont('helvetica', 'italic').setFontSize(7).setTextColor(107, 114, 128);
                        doc.text(`${field.more} additional answers are available in the registration details below.`, PAGE.margin, y);
                        y += 5;
                    }
                }
            });
        }

        sectionTitle('Full payment details');
        autoTable(doc, {
            startY: y,
            margin: { left: PAGE.margin, right: PAGE.margin },
            theme: 'grid',
            showHead: 'everyPage',
            head: [['Reference', 'Participant', 'Amount', 'Status / method', 'Razorpay order ID', 'Payment ID', 'Provider status', 'Submitted']],
            body: submissions.map((row) => [
                row.reference ?? '—',
                row.participant ?? '—',
                `${row.currency ?? 'INR'} ${Number(row.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                [
                    String(row.payment_status ?? 'unknown').replaceAll('_', ' '),
                    row.payment_method ? String(row.payment_method).replaceAll('_', ' ') : '',
                ].filter(Boolean).join(' · '),
                row.razorpay?.order_id ?? '—',
                row.razorpay?.payment_id ?? '—',
                row.razorpay?.status ?? '—',
                printDate(row.created_at),
            ]),
            styles: { fontSize: 5.5, cellPadding: 1.2, overflow: 'linebreak' },
            headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255], fontSize: 5.5 },
            columnStyles: {
                0: { cellWidth: 21 },
                1: { cellWidth: 27 },
                2: { cellWidth: 19 },
                3: { cellWidth: 24 },
                4: { cellWidth: 24 },
                5: { cellWidth: 24 },
                6: { cellWidth: 18 },
                7: { cellWidth: 25 },
            },
        });
        y = doc.lastAutoTable.finalY + 5;
        doc.addPage();
        y = PAGE.margin;
        sectionTitle('Complete registration data · all form answers and entries');

        const answerDetails = (submission) => (submission.details ?? [])
            .flatMap((section) => [
                `${section.title}:`,
                ...(section.items ?? []).map((item) => {
                    const value = item.value === null || item.value === '' ? '—' : answerText(item.value);
                    return `${item.label}: ${value}`;
                }),
            ])
            .join('\n');

        const entryDetails = (submission) => (submission.entries ?? [])
            .flatMap((grid) => [
                `${grid.label}:`,
                ...(grid.rows ?? []).map((entry, index) => (
                    `#${index + 1} · ${grid.columns.map((column) => (
                        `${column.label}: ${entry[column.key] ?? '—'}`
                    )).join(' · ')}`
                )),
            ])
            .join('\n');

        autoTable(doc, {
            startY: y,
            margin: { left: PAGE.margin, right: PAGE.margin },
            theme: 'grid',
            showHead: 'everyPage',
            head: [['Registration', 'Participant & contact', 'Payment details', 'Form answers and entries']],
            body: submissions.map((row) => [
                `${row.reference ?? '—'}\nSubmitted: ${printDate(row.created_at)}`,
                [
                    row.participant ?? '—',
                    row.participantType?.label,
                    row.email,
                    row.phone,
                ].filter(Boolean).join('\n'),
                [
                    `${row.currency ?? 'INR'} ${Number(row.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    `Status: ${String(row.payment_status ?? 'unknown').replaceAll('_', ' ')}`,
                    `Method: ${row.payment_method ?? '—'}`,
                    `Order ID: ${row.razorpay?.order_id ?? '—'}`,
                    `Payment ID: ${row.razorpay?.payment_id ?? '—'}`,
                    `Provider status: ${row.razorpay?.status ?? '—'}`,
                ].join('\n'),
                [
                    answerDetails(row),
                    entryDetails(row),
                ].filter(Boolean).join('\n'),
            ]),
            styles: {
                fontSize: 5.5,
                cellPadding: 1.5,
                overflow: 'linebreak',
                valign: 'top',
                lineColor: [229, 231, 235],
            },
            headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255], fontSize: 6 },
            columnStyles: {
                0: { cellWidth: 29 },
                1: { cellWidth: 38 },
                2: { cellWidth: 48 },
                3: { cellWidth: 67 },
            },
        });
        y = doc.lastAutoTable.finalY + 5;
    } else {
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
    }

    if (!reportData) submissions.forEach((submission) => {
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

export const exportPdf = async (submissions, labels, reportData = null) => {
    const doc = await buildPdf(submissions, labels, reportData);

    doc.save(exportFilename(labels.formName, 'pdf'));
};

const reportDate = (value, includeTime = false) => {
    if (!value) return '—';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleString('en-IN', includeTime
        ? { dateStyle: 'medium', timeStyle: 'short' }
        : { day: 'numeric', month: 'short', year: 'numeric' });
};

const reportMoney = (value, currency) => {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'Unavailable';

    const amount = Number(value).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    return currency === 'INR' ? `₹${amount}` : `${currency || 'INR'} ${amount}`;
};

const humanize = (value) => String(value || '—').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const reportPaymentAmount = (registration) => (registration.amountPaid ?? [])
    .map((item) => reportMoney(item.amount, item.currency))
    .join(' / ') || '—';

const fontAsBase64 = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Could not load the PDF font.');

    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }

    return btoa(binary);
};

const configureEventReportFont = async (doc) => {
    const [regular, bold] = await Promise.all([
        fontAsBase64(notoSansRegularUrl),
        fontAsBase64(notoSansBoldUrl),
    ]);

    doc.addFileToVFS('NotoSans-Regular.ttf', regular);
    doc.addFileToVFS('NotoSans-Bold.ttf', bold);
    doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
};

/** Build the complete event report from the server's form-scoped aggregates. */
export const buildEventReportPdf = async (report) => {
    if (!report?.form?.id || !report.summary || !Array.isArray(report.registrations)) {
        throw new Error('The event report data is incomplete.');
    }

    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    await configureEventReportFont(doc);
    doc.setFont('NotoSans', 'normal');
    const margin = 14;
    const width = PAGE.width - margin * 2;
    const footerHeight = 19;
    const summary = report.summary;
    const form = report.form;
    const event = report.event ?? {};
    let y = margin;

    const reserve = (height) => {
        if (y + height > PAGE.height - margin - footerHeight) {
            doc.addPage();
            y = margin;
        }
    };

    const sectionTitle = (title) => {
        reserve(12);
        doc.setFillColor(255, 247, 237);
        doc.rect(margin, y, width, 8, 'F');
        doc.setFont('NotoSans', 'bold').setFontSize(9).setTextColor(124, 45, 18);
        doc.text(String(title), margin + 3, y + 5.4);
        y += 11;
    };

    const table = (head, body, columnStyles = {}, options = {}) => {
        autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin, bottom: footerHeight + 2 },
            theme: 'grid',
            head,
            body,
            styles: {
                font: 'NotoSans',
                fontSize: 7.5,
                cellPadding: 1.8,
                overflow: 'linebreak',
                valign: 'top',
                lineColor: [229, 231, 235],
                textColor: [31, 41, 55],
            },
            headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles,
            showHead: 'everyPage',
            ...options,
        });
        y = doc.lastAutoTable.finalY + 5;
    };

    const bars = (items, color = [249, 115, 22]) => {
        const maximum = Math.max(1, ...items.map((item) => Number(item.count) || 0));
        items.forEach((item) => {
            reserve(10);
            const label = humanize(item.label);
            doc.setFont('NotoSans', 'normal').setFontSize(7).setTextColor(55, 65, 81);
            doc.text(doc.splitTextToSize(label, width - 25)[0] || '—', margin, y + 3);
            doc.setFont('NotoSans', 'bold').setTextColor(31, 41, 55);
            doc.text(String(Number(item.count) || 0), margin + width, y + 3, { align: 'right' });
            y += 4;
            doc.setFillColor(243, 244, 246);
            doc.rect(margin, y, width, 2, 'F');
            const barWidth = width * Math.max(0, Math.min(1, (Number(item.count) || 0) / maximum));
            if (barWidth > 0) {
                doc.setFillColor(...color);
                doc.rect(margin, y, barWidth, 2, 'F');
            }
            y += 6;
        });
    };

    const title = event.name || form.name || 'Event report';
    const titleLines = doc.splitTextToSize(String(title), width - 8);
    const headerHeight = Math.max(47, 23 + Math.min(titleLines.length, 3) * 7);
    doc.setFillColor(17, 24, 39);
    doc.rect(0, 0, PAGE.width, headerHeight, 'F');
    doc.setFillColor(249, 115, 22);
    doc.rect(0, 0, 4, headerHeight, 'F');
    doc.setFont('NotoSans', 'bold').setFontSize(16).setTextColor(255, 255, 255);
    doc.text(titleLines, margin, 16);
    doc.setFont('NotoSans', 'normal').setFontSize(8).setTextColor(253, 186, 116);
    doc.text(`Form: ${form.title || form.name || '—'}  ·  Form ID: ${form.id}`, margin, headerHeight - 14);
    doc.setTextColor(209, 213, 219);
    doc.text(`Generated ${reportDate(report.generatedAt, true)}`, margin, headerHeight - 7);
    y = headerHeight + 7;

    sectionTitle('Event & form information');
    const location = [event.venue, event.address, event.state].filter(Boolean).join(', ') || '—';
    table(
        [['Information', 'Details']],
        [
            ['Event name', event.name || '—'],
            ['Form title', form.title || form.name || '—'],
            ['Form ID / Registration ID', String(form.id)],
            ['Event location', location],
            ['Event date', reportDate(event.date)],
            ['Registration start date', reportDate(form.registrationStart)],
            ['Registration end date', reportDate(form.registrationEnd)],
            ['Report generated', reportDate(report.generatedAt, true)],
            ['Report generated by', report.generatedBy || '—'],
        ],
        { 0: { cellWidth: 55, fontStyle: 'bold' } }
    );

    sectionTitle('Registration overview');
    const cards = [
        ['Registrations', summary.registrations],
        ['Players', summary.players],
        ['Teams', summary.teams],
        ['Online paid', summary.onlinePayments],
        ['Offline paid', summary.offlinePayments],
        ['Pending', summary.pendingPayments],
        ['Failed', summary.failedPayments],
        ['Cancelled', summary.cancelledRegistrations],
    ];
    for (let index = 0; index < cards.length; index += 4) {
        reserve(23);
        const row = cards.slice(index, index + 4);
        const gap = 3;
        const cardWidth = (width - gap * (row.length - 1)) / row.length;
        row.forEach(([label, value], cardIndex) => {
            const x = margin + cardIndex * (cardWidth + gap);
            const fill = cardIndex % 2 === 0 ? [255, 237, 213] : [237, 233, 254];
            doc.setFillColor(...fill);
            doc.rect(x, y, cardWidth, 19, 'F');
            doc.setFont('NotoSans', 'normal').setFontSize(7).setTextColor(75, 85, 99);
            doc.text(label, x + 3, y + 6);
            doc.setFont('NotoSans', 'bold').setFontSize(12).setTextColor(17, 24, 39);
            doc.text(Number(value || 0).toLocaleString('en-IN'), x + 3, y + 14);
        });
        y += 23;
    }

    if (report.meta?.capped || report.meta?.playersCapped) {
        reserve(12);
        doc.setFont('NotoSans', 'normal').setFontSize(7).setTextColor(146, 64, 14);
        const notes = [];
        if (report.meta?.capped) {
            notes.push(`Registration details include ${Number(report.meta.included).toLocaleString('en-IN')} of ${Number(report.meta.total).toLocaleString('en-IN')} records.`);
        }
        if (report.meta?.playersCapped) {
            notes.push(`Player details include ${Number(report.meta.playersIncluded).toLocaleString('en-IN')} records.`);
        }
        doc.text(doc.splitTextToSize(notes.join(' '), width), margin, y);
        y += 7;
    }

    sectionTitle('Financial summary');
    const financialRows = [];
    (summary.financials ?? []).forEach((financial) => {
        const currency = financial.currency || form.currency || 'INR';
        financialRows.push(
            [`${currency} · Expected registration amount`, '', reportMoney(financial.registrationAmount, currency)],
            [`${currency} · Online successful payments`, financial.onlineTransactions, reportMoney(financial.onlineAmount, currency)],
            [`${currency} · Offline successful payments`, financial.offlineTransactions, reportMoney(financial.offlineAmount, currency)],
            [`${currency} · Pending payment attempts`, financial.pendingTransactions, reportMoney(financial.pendingAmount, currency)],
            [`${currency} · Failed payment attempts`, financial.failedTransactions, reportMoney(financial.failedAmount, currency)],
            [`${currency} · Gross amount received`, financial.successfulTransactions, reportMoney(financial.receivedAmount, currency)],
            [`${currency} · Refund amount`, financial.refundedTransactions, reportMoney(financial.refundAmount, currency)],
            [`${currency} · Net collection`, '', reportMoney(financial.netCollectionAmount, currency)]
        );
    });
    table(
        [['Payment category', 'Transactions', 'Amount']],
        financialRows.length > 0 ? financialRows : [['No payment records', '0', reportMoney('0.00', form.currency)]],
        { 0: { cellWidth: 88 }, 1: { cellWidth: 27, halign: 'right' }, 2: { halign: 'right' } }
    );
    if ((summary.financials ?? []).some((financial) => (financial.providerBreakdown ?? []).length > 0)) {
        sectionTitle('Payment provider breakdown');
        const providerRows = summary.financials.flatMap((financial) => (
            financial.providerBreakdown ?? []
        ).map((provider) => [
            financial.currency || 'INR',
            humanize(provider.provider),
            reportMoney(provider.amount, financial.currency || 'INR'),
        ]));
        table(
            [['Currency', 'Payment provider', 'Amount received']],
            providerRows,
            { 0: { cellWidth: 25 }, 1: { cellWidth: 85 }, 2: { halign: 'right' } }
        );
    }

    sectionTitle('Online and offline breakdown');
    const sourceRows = (summary.sourceBreakdown ?? []).map((item) => [humanize(item.label), item.count]);
    const methodRows = (summary.paymentModeBreakdown ?? []).map((item) => [humanize(item.label), item.count]);
    table(
        [['Registration source', 'Registrations']],
        sourceRows.length > 0 ? sourceRows : [['No registration sources', 0]],
        { 0: { cellWidth: 120 }, 1: { halign: 'right' } }
    );
    y += 1;
    table(
        [['Successful payment mode', 'Registrations']],
        methodRows.length > 0 ? methodRows : [['No successful payment records', 0]],
        { 0: { cellWidth: 120 }, 1: { halign: 'right' } }
    );
    const sourcesForChart = summary.sourceBreakdown ?? [];
    if (sourcesForChart.length > 0) {
        sectionTitle('Registrations by source');
        bars(sourcesForChart, [249, 115, 22]);
    }
    const methodsForChart = summary.paymentModeBreakdown ?? [];
    if (methodsForChart.length > 0) {
        sectionTitle('Paid registrations by mode');
        bars(methodsForChart, [16, 185, 129]);
    }

    sectionTitle('Winners & Achievements');
    const winners = report.winners ?? { total: 0, first: 0, second: 0, third: 0, rows: [] };
    const winnerCards = [
        ['Total winners', winners.total],
        ['First position', winners.first],
        ['Second position', winners.second],
        ['Third position', winners.third],
    ];
    reserve(23);
    const winnerGap = 3;
    const winnerWidth = (width - winnerGap * 3) / 4;
    winnerCards.forEach(([label, value], index) => {
        const x = margin + index * (winnerWidth + winnerGap);
        const fills = [[255, 247, 205], [243, 244, 246], [254, 235, 220], [237, 233, 254]];
        doc.setFillColor(...fills[index]);
        doc.rect(x, y, winnerWidth, 19, 'F');
        doc.setFont('NotoSans', 'normal').setFontSize(7).setTextColor(75, 85, 99);
        doc.text(label, x + 3, y + 6);
        doc.setFont('NotoSans', 'bold').setFontSize(12).setTextColor(17, 24, 39);
        doc.text(Number(value || 0).toLocaleString('en-IN'), x + 3, y + 14);
    });
    y += 23;

    const winnerRows = (winners.rows ?? []).map((winner, index) => [
        index + 1,
        ({ 1: '1st', 2: '2nd', 3: '3rd' })[winner.place] || String(winner.place),
        winner.name || '—',
        winner.category || '—',
        winner.teamOrAssociation || '—',
        winner.registration || '—',
    ]);
    if (winnerRows.length > 0) {
        table(
            [['Sr. No.', 'Position', 'Winner', 'Category', 'Team / Association', 'Registration']],
            winnerRows,
            {
                0: { cellWidth: 13, halign: 'center' },
                1: { cellWidth: 17 },
                2: { cellWidth: 39 },
                3: { cellWidth: 39 },
                4: { cellWidth: 39 },
            }
        );
    } else {
        reserve(8);
        doc.setFont('NotoSans', 'normal').setFontSize(8).setTextColor(75, 85, 99);
        doc.text('No winner records available', margin, y);
        y += 7;
    }

    sectionTitle('Detailed registration records');
    const registrationRows = report.registrations.map((registration) => [
        registration.reference || '—',
        [
            registration.participant || '—',
            registration.contactPerson && registration.contactPerson !== registration.participant ? registration.contactPerson : '',
            registration.phone,
            registration.email,
        ].filter(Boolean).join('\n'),
        [registration.registrationType, registration.category].filter(Boolean).join('\n') || '—',
        [registration.source, registration.paymentMethod].filter(Boolean).map(humanize).join('\n') || '—',
        [registration.status, registration.paymentStatus].filter(Boolean).map(humanize).join('\n') || '—',
        reportDate(registration.registrationDate),
        reportPaymentAmount(registration),
    ]);
    if (registrationRows.length > 0) {
        table(
            [['Registration No.', 'Participant / Contact', 'Type / Category', 'Source / Payment', 'Registration / Payment status', 'Registered', 'Amount paid']],
            registrationRows,
            {
                0: { cellWidth: 22 },
                1: { cellWidth: 40 },
                2: { cellWidth: 27 },
                3: { cellWidth: 25 },
                4: { cellWidth: 29 },
                5: { cellWidth: 20 },
                6: { cellWidth: 19, halign: 'right' },
            },
            { rowPageBreak: 'auto' }
        );
    } else {
        reserve(8);
        doc.setFont('NotoSans', 'normal').setFontSize(8).setTextColor(75, 85, 99);
        doc.text('No registration records available', margin, y);
        y += 7;
    }

    sectionTitle('Player details');
    const playerRows = (report.players ?? []).map((player) => [
        player.registration || '—',
        player.team || '—',
        player.name || '—',
        player.category || '—',
    ]);
    table(
        [['Registration No.', 'Team', 'Player', 'Category']],
        playerRows.length > 0 ? playerRows : [['—', '—', '—', 'No team roster details available']],
        { 0: { cellWidth: 31 }, 1: { cellWidth: 45 }, 2: { cellWidth: 48 } },
        { rowPageBreak: 'auto' }
    );

    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
        doc.setPage(page);
        doc.setDrawColor(229, 231, 235).setLineWidth(0.25);
        doc.line(margin, PAGE.height - footerHeight, PAGE.width - margin, PAGE.height - footerHeight);
        doc.setFont('NotoSans', 'normal').setFontSize(7).setTextColor(107, 114, 128);
        doc.text(`${form.name || 'Event report'} · Form #${form.id}`, margin, PAGE.height - 8);
        doc.text(`${page} / ${pages}`, PAGE.width - margin, PAGE.height - 8, { align: 'right' });
    }

    return doc;
};

export const exportEventReportPdf = async (report) => {
    const doc = await buildEventReportPdf(report);
    const filename = exportFilename(report.event?.name || report.form.name, 'pdf');
    doc.save(filename);
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

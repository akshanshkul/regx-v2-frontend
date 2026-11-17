/**
 * The two documents a tournament actually runs on, built from the same
 * registrations the table shows.
 *
 * Both read the repeatable entry grids rather than the registration as a whole:
 * one competitor entering three weight classes is three lines on a category
 * list, and a team's roster is however many players it carries. Neither is
 * useful for a conference, which is why the data page only offers them when the
 * event's type is marked as a sport.
 */

import { exportExcelRows, buildPrintDocument } from './submissionExport';

/**
 * Every entry, flattened out of its registration.
 *
 * Column keys differ per form, so the grid's own column definitions are carried
 * along rather than assumed — a form with "Belt" instead of "Weight Category"
 * still produces a usable sheet.
 */
export const flattenEntries = (submissions) => {
    const rows = [];

    submissions.forEach((submission) => {
        (submission.entries ?? []).forEach((grid) => {
            grid.rows.forEach((entry, index) => {
                rows.push({
                    submission,
                    grid,
                    entry,
                    index,
                    columns: grid.columns,
                });
            });
        });
    });

    return rows;
};

/** The column labels that appear across every grid, in first-seen order. */
export const entryColumnLabels = (submissions) => {
    const labels = [];

    submissions.forEach((submission) =>
        (submission.entries ?? []).forEach((grid) =>
            grid.columns.forEach((column) => {
                if (!labels.includes(column.label)) labels.push(column.label);
            })
        )
    );

    return labels;
};

/**
 * Columns that describe the category rather than the person — everything except
 * the free-text ones, which is what a competitor is grouped by.
 */
const categoryColumns = (columns) => columns.filter((column) => (column.type ?? 'select') === 'select');

const nameColumn = (columns) => columns.find((column) => (column.type ?? 'select') !== 'select');

/**
 * The registrant's gender, when the form asks for it outside the entry grid —
 * it then leads the category ("Female · Junior · 60 kg"). A grid that already
 * has its own gender column is left alone.
 */
const genderOf = (row) => {
    const isGender = (key, type) => key === 'gender' || type === 'gender';

    if (row.columns.some((column) => isGender(column.key, column.type))) return null;

    for (const section of row.submission.details ?? []) {
        const item = section.items.find((i) => isGender(i.key, i.type));

        if (item && item.value) return String(item.value);
    }

    return null;
};

const categoryOf = (row) =>
    [genderOf(row), ...categoryColumns(row.columns).map((column) => row.entry[column.key] || '—')]
        .filter(Boolean)
        .join(' · ');

/**
 * Who this entry is for: a roster line names its own player, an individual's
 * own entry is the registrant.
 */
const competitorOf = (row) => {
    const column = nameColumn(row.columns);

    return (column && row.entry[column.key]) || row.submission.participant || '—';
};

// -------------------------------------------------------------- category list

/**
 * Every competitor grouped by the category they are competing in — the list a
 * tournament seeds draws from.
 */
export const buildCategoryList = (submissions) => {
    const rows = flattenEntries(submissions);
    const groups = new Map();
    const parts = new Map();

    rows.forEach((row) => {
        const key = categoryOf(row);

        if (!groups.has(key)) {
            groups.set(key, []);
            // What the category is made of, labelled — "Age: Sub-Junior".
            parts.set(key, [
                ...(genderOf(row) ? [{ label: 'Gender', value: genderOf(row) }] : []),
                ...categoryColumns(row.columns).map((column) => ({
                    label: column.label,
                    value: row.entry[column.key] || '—',
                })),
            ]);
        }

        groups.get(key).push({
            competitor: competitorOf(row),
            team: row.submission.participantType?.value === 'team' ? row.submission.participant : '',
            reference: row.submission.reference,
            email: row.submission.email ?? '',
            phone: row.submission.phone ?? '',
            payment: row.submission.payment_status ?? '',
            // What the scale said, once someone has weighed them in.
            weighedKg: row.submission.weighIn?.kg ?? null,
        });
    });

    // Alphabetical by category, then by competitor, so the same export run twice
    // produces the same document.
    return [...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, entries]) => ({
            category,
            parts: parts.get(category),
            entries: entries.sort((a, b) => a.competitor.localeCompare(b.competitor)),
        }));
};

export const exportCategoryList = async (submissions, formName) => {
    const groups = buildCategoryList(submissions);

    const columns = ['Category', '#', 'Competitor', 'Team', 'Registration ID', 'Phone', 'Email', 'Payment'];

    // One line per entry, keeping its number within its category.
    const lines = groups.flatMap((group) =>
        group.entries.map((entry, index) => ({ group, entry, number: index + 1 }))
    );

    // A player's lines sit together — by name, then registration, then
    // category — so someone in three categories reads as three rows in a row,
    // not one near the top and one near the bottom. The Category column and
    // its filter still give the per-category view.
    lines.sort(
        (a, b) =>
            a.entry.competitor.localeCompare(b.entry.competitor) ||
            a.entry.reference.localeCompare(b.entry.reference) ||
            a.group.category.localeCompare(b.group.category)
    );

    const rows = lines.map(({ group, entry, number }) => [
        group.category,
        String(number),
        entry.competitor,
        entry.team,
        entry.reference,
        entry.phone,
        entry.email,
        entry.payment,
    ]);

    // A player entered in more than one category gets one colour on every
    // line of theirs, so the same person is easy to pick out.
    const colourOf = multiCategoryColours(groups);
    const rowFills = lines.map(({ entry }) => colourOf.get(playerKey(entry)) ?? null);

    await exportExcelRows({ columns, rows, rowFills }, `${formName} — categories`, 'Categories');
};

/**
 * One person: their registration plus their name. A team registration lists
 * several players under one reference, so the reference alone is not enough.
 */
const playerKey = (entry) => `${entry.reference}|${entry.competitor.trim().toLowerCase()}`;

/**
 * A light colour for each player found in two or more categories, in a
 * random order each export. Colours step round the colour wheel by the golden
 * angle from a random start, so however many players there are, neighbouring
 * colours stay distinct and pale enough to read black text on.
 */
const multiCategoryColours = (groups) => {
    const categoriesOf = new Map();

    groups.forEach((group) =>
        group.entries.forEach((entry) => {
            const key = playerKey(entry);
            if (!categoriesOf.has(key)) categoriesOf.set(key, new Set());
            categoriesOf.get(key).add(group.category);
        })
    );

    const players = [...categoriesOf.entries()].filter(([, cats]) => cats.size > 1).map(([key]) => key);

    // Random order, so colours are not handed out in alphabetical order.
    for (let i = players.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [players[i], players[j]] = [players[j], players[i]];
    }

    const start = Math.random() * 360;

    return new Map(players.map((key, i) => [key, pastel((start + i * 137.508) % 360)]));
};

/** A pale colour of the given hue, as 'RRGGBB'. */
const pastel = (hue) => {
    const s = 0.75;
    const l = 0.85;
    const k = (n) => (n + hue / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const channel = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));

    return [channel(0), channel(8), channel(4)].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
};

// --------------------------------------------------------------- weigh-in sheet

/**
 * A paper form: every competitor in category order. Actual weight is filled in
 * for anyone already weighed on the weigh-in desk; the rest, the official and
 * the signature are left blank to write in.
 */
export const printWeighInSheet = (submissions, { formName, eventTitle }) => {
    const groups = buildCategoryList(submissions);

    const sections = groups.map((group) => ({
        title: group.category,
        columns: ['#', 'Competitor', 'Reg. ID', 'Actual weight', 'Official', 'Signature'],
        rows: group.entries.map((entry, index) => [
            String(index + 1),
            entry.competitor,
            entry.reference,
            entry.weighedKg == null ? '' : `${Number(entry.weighedKg)} kg`,
            '',
            '',
        ]),
        blankColumns: 2,
    }));

    buildPrintDocument({
        title: `${formName} — weigh-in`,
        subtitle: [eventTitle, `${sections.reduce((n, s) => n + s.rows.length, 0)} competitors`]
            .filter(Boolean)
            .join(' · '),
        sections,
    });
};

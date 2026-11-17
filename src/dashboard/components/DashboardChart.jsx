import React, { useId } from 'react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#8B5CF6', '#94A3B8'];
const WIDTH = 360;
const HEIGHT = 200;
const LEFT = 44;
const RIGHT = 354;
const TOP = 14;
const BOTTOM = 162;

const numberValue = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : 0;
};

const niceMaximum = (values) => {
    const max = Math.max(...values, 0);
    if (max === 0) return 1;

    const magnitude = 10 ** Math.floor(Math.log10(max));
    const fraction = max / magnitude;
    const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;

    return niceFraction * magnitude;
};

const tickLabel = (value, currency) => {
    if (!currency) return String(Math.round(value));
    return value >= 1000 ? `₹${Math.round(value / 1000)}K` : `₹${Math.round(value)}`;
};

const visibleLabelIndexes = (length) => {
    if (length <= 6) return Array.from({ length }, (_, index) => index);

    const stride = Math.ceil((length - 1) / 5);
    return Array.from(new Set([0, ...Array.from({ length: Math.floor((length - 1) / stride) }, (_, index) => (index + 1) * stride), length - 1]));
};

const donutSegments = (items, total, circumference) =>
    items.reduce((segments, item, index) => {
        const previous = segments[index - 1];
        const value = numberValue(item.value);

        return [
            ...segments,
            {
                item,
                index,
                length: total > 0 ? (value / total) * circumference : 0,
                offset: previous ? previous.offset + previous.length : 0,
            },
        ];
    }, []);

const Grid = ({ max, currency }) => (
    <>
        {[0, 1, 2, 3, 4].map((tick) => {
            const y = BOTTOM - ((BOTTOM - TOP) * tick) / 4;
            const value = (max * tick) / 4;

            return (
                <g key={tick}>
                    <line x1={LEFT} x2={RIGHT} y1={y} y2={y} stroke="#e5e7eb" strokeDasharray="4 4" />
                    <text x={LEFT - 8} y={y + 3} textAnchor="end" fill="#9ca3af" fontSize="10">
                        {tickLabel(value, currency)}
                    </text>
                </g>
            );
        })}
    </>
);

const AxisLabels = ({ labels, xForIndex }) => (
    <>
        {visibleLabelIndexes(labels.length).map((index) => (
            <text
                key={`${labels[index]}-${index}`}
                x={xForIndex(index)}
                y={HEIGHT - 3}
                textAnchor="middle"
                fill="#6b7280"
                fontSize="10"
            >
                {labels[index]}
            </text>
        ))}
    </>
);

const TrendChart = ({ labels, values, gradientId }) => {
    const max = niceMaximum(values);
    const xForIndex = (index) =>
        labels.length <= 1 ? (LEFT + RIGHT) / 2 : LEFT + ((RIGHT - LEFT) * index) / (labels.length - 1);
    const yForValue = (value) => BOTTOM - (numberValue(value) / max) * (BOTTOM - TOP);
    const points = values.map((value, index) => [xForIndex(index), yForValue(value)]);
    const linePath = points
        .map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`)
        .join(' ');
    const areaPath = points.length
        ? `${linePath} L ${points[points.length - 1][0]} ${BOTTOM} L ${points[0][0]} ${BOTTOM} Z`
        : '';

    return (
        <svg
            role="img"
            aria-label="Registration trend"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-[250px] w-full"
            preserveAspectRatio="none"
        >
            <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#FF5A36" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#FF5A36" stopOpacity="0" />
                </linearGradient>
            </defs>
            <Grid max={max} />
            {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
            {linePath && <path d={linePath} fill="none" stroke="#FF5A36" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
            {points.map(([x, y], index) => (
                <circle key={index} cx={x} cy={y} r="3" fill="#FF5A36">
                    <title>{`${labels[index]}: ${values[index]} registrations`}</title>
                </circle>
            ))}
            <AxisLabels labels={labels} xForIndex={xForIndex} />
        </svg>
    );
};

const DonutChart = ({ items }) => {
    const total = items.reduce((sum, item) => sum + numberValue(item.value), 0);
    const radius = 55;
    const circumference = 2 * Math.PI * radius;
    const segments = donutSegments(items, total, circumference);

    return (
        <div className="flex h-[250px] w-full items-center justify-center gap-3">
            <svg role="img" aria-label={`Registrations by category, ${total} total`} viewBox="0 0 160 160" className="h-40 w-40 shrink-0">
                <circle cx="80" cy="80" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="18" />
                {segments.map(({ item, index, length, offset }) => {
                    if (length === 0) return null;
                    const value = numberValue(item.value);

                    return (
                        <circle
                            key={`${item.label}-${index}`}
                            cx="80"
                            cy="80"
                            r={radius}
                            fill="none"
                            stroke={COLORS[index % COLORS.length]}
                            strokeWidth="18"
                            strokeDasharray={`${length} ${circumference - length}`}
                            strokeDashoffset={-offset}
                            transform="rotate(-90 80 80)"
                        >
                            <title>{`${item.label}: ${value} registrations`}</title>
                        </circle>
                    );
                })}
                <text x="80" y="77" textAnchor="middle" fill="#111827" fontSize="24" fontWeight="600">{total}</text>
                <text x="80" y="96" textAnchor="middle" fill="#6b7280" fontSize="11">Total</text>
            </svg>
            <ul className="max-h-[190px] min-w-0 space-y-2 overflow-y-auto text-xs">
                {items.map((item, index) => (
                    <li key={`${item.label}-${index}`} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="truncate text-gray-600" title={item.label}>{item.label}</span>
                        <span className="shrink-0 font-medium text-gray-800">{numberValue(item.value)}</span>
                    </li>
                ))}
                {items.length === 0 && <li className="text-gray-400">No registrations yet</li>}
            </ul>
        </div>
    );
};

const RevenueChart = ({ labels, values }) => {
    const max = niceMaximum(values);
    const slot = (RIGHT - LEFT) / Math.max(values.length, 1);
    const barWidth = Math.min(slot * 0.45, 34);
    const xForIndex = (index) => LEFT + slot * (index + 0.5);

    return (
        <svg
            role="img"
            aria-label="Revenue overview"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-[250px] w-full"
            preserveAspectRatio="none"
        >
            <Grid max={max} currency />
            {values.map((value, index) => {
                const numericValue = numberValue(value);
                const barHeight = (numericValue / max) * (BOTTOM - TOP);

                return (
                    <rect
                        key={`${labels[index]}-${index}`}
                        x={xForIndex(index) - barWidth / 2}
                        y={BOTTOM - barHeight}
                        width={barWidth}
                        height={barHeight}
                        rx="4"
                        fill="#FF5A36"
                    >
                        <title>{`${labels[index]}: ₹${numericValue.toLocaleString('en-IN')}`}</title>
                    </rect>
                );
            })}
            <AxisLabels labels={labels} xForIndex={xForIndex} />
        </svg>
    );
};

const DashboardChart = ({ type, labels = [], values = [], items = [], className = '' }) => {
    const gradientId = useId().replace(/:/g, '');

    return (
        <div className={className}>
            {type === 'area' && <TrendChart labels={labels} values={values} gradientId={gradientId} />}
            {type === 'donut' && <DonutChart items={items} />}
            {type === 'bar' && <RevenueChart labels={labels} values={values} />}
        </div>
    );
};

export default DashboardChart;

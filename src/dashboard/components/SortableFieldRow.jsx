import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronUp, ChevronDown, EyeOff } from 'lucide-react';

/**
 * One row of the builder canvas.
 *
 * Dragging is bound to the grip handle only, so clicking anywhere else still
 * selects the field for editing. The up/down arrows stay as a second path —
 * they are more discoverable than the keyboard drag, and they work identically
 * on touch.
 */
const SortableFieldRow = ({ field, index, total, isSelected, onSelect, onMove, isOverlay = false }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: field.key, disabled: isOverlay });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    // Absent means on the form, so a field saved before disabling existed does
    // not read as switched off.
    const enabled = field.enabled !== false;

    return (
        <div
            ref={isOverlay ? undefined : setNodeRef}
            style={isOverlay ? undefined : style}
            onClick={() => onSelect?.(field.key)}
            className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors bg-white ${
                isDragging
                    ? 'opacity-40 border-dashed border-gray-400'
                    : isSelected
                      ? 'border-regx-orange bg-orange-50/50'
                      : 'border-gray-200 hover:border-gray-300'
            } ${isOverlay ? 'shadow-lg border-regx-orange cursor-grabbing' : ''} ${
                enabled ? '' : 'bg-gray-50'
            }`}
        >
            <button
                type="button"
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Reorder ${field.label || field.key}`}
                className="touch-none p-0.5 -m-0.5 rounded text-gray-300 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-regx-orange/40 cursor-grab active:cursor-grabbing shrink-0"
            >
                <GripVertical className="w-4 h-4" />
            </button>

            <div className="flex flex-col shrink-0">
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onMove?.(index, -1); }}
                    disabled={index === 0}
                    aria-label="Move up"
                    className="text-gray-300 hover:text-gray-600 disabled:opacity-30"
                >
                    <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onMove?.(index, 1); }}
                    disabled={index === total - 1}
                    aria-label="Move down"
                    className="text-gray-300 hover:text-gray-600 disabled:opacity-30"
                >
                    <ChevronDown className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="min-w-0 flex-1">
                <p
                    className={`text-sm font-medium truncate ${
                        enabled ? 'text-gray-900' : 'text-gray-400 line-through decoration-gray-300'
                    }`}
                >
                    {field.label || field.key}
                    {field.required && enabled && <span className="text-red-500 ml-0.5">*</span>}
                </p>
                <p className="text-[11px] text-gray-400 font-mono truncate">
                    {field.key} · {field.type}
                </p>
            </div>

            {/* Struck through and labelled, so a question that is not being asked
                is obvious at a glance rather than only in the settings panel. */}
            {!enabled && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0 inline-flex items-center gap-1">
                    <EyeOff className="w-3 h-3" />
                    disabled
                </span>
            )}

            {enabled && field.hidden && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0">
                    hidden
                </span>
            )}
        </div>
    );
};

export default SortableFieldRow;

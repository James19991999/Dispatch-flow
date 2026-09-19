"use client";

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, CheckCircle2, Circle } from "lucide-react";
import { cx } from "@/lib/utils";
import type { RouteStop } from "@/types/models";

function SortableStop({ stop, index }: { stop: RouteStop; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stop.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cx(
        "flex items-center gap-3 rounded-control border border-outline-variant bg-surface px-3 py-3",
        isDragging && "opacity-60 shadow-card-2"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="flex h-8 w-8 shrink-0 cursor-grab touch-none items-center justify-center text-ink-muted active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-container text-xs font-bold text-ink-muted">
        {index + 1}
      </div>
      {stop.status === "completed" ? (
        <CheckCircle2 size={18} className="shrink-0 text-delivered" />
      ) : (
        <Circle size={18} className="shrink-0 text-outline" />
      )}
      <div className="min-w-0 flex-1">
        <p className={cx("truncate text-sm font-semibold", stop.status === "completed" ? "text-ink-muted line-through" : "text-ink")}>
          {stop.address}
        </p>
        <p className="truncate text-xs text-ink-muted">{stop.label}</p>
      </div>
    </div>
  );
}

export function SortableStopList({
  stops,
  onReorder,
  disabled,
}: {
  stops: RouteStop[];
  onReorder: (newOrder: RouteStop[]) => void;
  disabled?: boolean;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stops.findIndex((s) => s.id === active.id);
    const newIndex = stops.findIndex((s) => s.id === over.id);
    onReorder(arrayMove(stops, oldIndex, newIndex).map((s, i) => ({ ...s, sequence: i })));
  }

  if (disabled) {
    return (
      <div className="space-y-2">
        {stops.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3 rounded-control border border-outline-variant bg-surface px-3 py-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-container text-xs font-bold text-ink-muted">
              {i + 1}
            </div>
            {s.status === "completed" ? (
              <CheckCircle2 size={18} className="shrink-0 text-delivered" />
            ) : (
              <Circle size={18} className="shrink-0 text-outline" />
            )}
            <div className="min-w-0 flex-1">
              <p className={cx("truncate text-sm font-semibold", s.status === "completed" ? "text-ink-muted line-through" : "text-ink")}>{s.address}</p>
              <p className="truncate text-xs text-ink-muted">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {stops.map((stop, i) => (
            <SortableStop key={stop.id} stop={stop} index={i} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

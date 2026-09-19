import { cx } from "@/lib/utils";
import type { DeliveryStatus, DriverStatus, VehicleStatus } from "@/types/models";

type Status = DeliveryStatus | DriverStatus | VehicleStatus | "active" | "completed" | "optimized" | "draft";

const STATUS_MAP: Record<string, { label: string; classes: string; dot: string }> = {
  pending: { label: "Pending", classes: "bg-pending-bg text-pending-text", dot: "bg-pending" },
  in_transit: { label: "In Transit", classes: "bg-transit-bg text-transit-text", dot: "bg-transit" },
  delivered: { label: "Delivered", classes: "bg-delivered-bg text-delivered-text", dot: "bg-delivered" },
  delayed: { label: "Delayed", classes: "bg-critical-bg text-critical-text", dot: "bg-critical" },
  exception: { label: "Exception", classes: "bg-critical-bg text-critical-text", dot: "bg-critical" },
  on_road: { label: "On Road", classes: "bg-transit-bg text-transit-text", dot: "bg-transit" },
  available: { label: "Available", classes: "bg-delivered-bg text-delivered-text", dot: "bg-delivered" },
  off_duty: { label: "Off Duty", classes: "bg-surface-container text-ink-muted", dot: "bg-outline" },
  active: { label: "Active", classes: "bg-delivered-bg text-delivered-text", dot: "bg-delivered" },
  maintenance: { label: "Maintenance", classes: "bg-pending-bg text-pending-text", dot: "bg-pending" },
  idle: { label: "Idle", classes: "bg-surface-container text-ink-muted", dot: "bg-outline" },
  completed: { label: "Completed", classes: "bg-delivered-bg text-delivered-text", dot: "bg-delivered" },
  optimized: { label: "Optimized", classes: "bg-transit-bg text-transit-text", dot: "bg-transit" },
  draft: { label: "Draft", classes: "bg-surface-container text-ink-muted", dot: "bg-outline" },
};

export function StatusPill({ status, className }: { status: Status | string; className?: string }) {
  const meta = STATUS_MAP[status] ?? { label: status, classes: "bg-surface-container text-ink-muted", dot: "bg-outline" };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
        meta.classes,
        className
      )}
    >
      <span className={cx("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

import { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-outline-variant bg-surface-container-low px-6 py-12 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink-muted">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-bold text-ink">{title}</p>
        <p className="text-sm text-ink-muted max-w-xs">{description}</p>
      </div>
      {action}
    </div>
  );
}

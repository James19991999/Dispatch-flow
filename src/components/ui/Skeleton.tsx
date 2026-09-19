import { cx } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-control bg-surface-container-high", className)} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-card border border-outline-variant bg-surface p-4 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

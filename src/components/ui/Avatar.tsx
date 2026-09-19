import { initials, cx } from "@/lib/utils";

export function Avatar({ name, size = 40, className }: { name: string; size?: number; className?: string }) {
  return (
    <div
      className={cx(
        "flex items-center justify-center rounded-full bg-brand-light font-bold text-brand-dark shrink-0",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name) || "?"}
    </div>
  );
}
